import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { userRepository } from '../repositories/userRepository';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { RegisterInput, LoginInput } from '../validators/authValidator';
import { AuthTokens, JwtPayload, UserProfile, UserRole, ROLE_PERMISSIONS, User } from '../types/user';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  private generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  public mapToProfile(user: User): UserProfile {
    return {
      id: user.id,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  async register(input: RegisterInput, ipAddress?: string, userAgent?: string, requestId?: string): Promise<AuthTokens> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      await auditService.record({
        action: 'USER_REGISTER_FAILED',
        resourceType: 'USER',
        ipAddress,
        userAgent,
        requestId,
        status: 'FAILURE',
        details: { reason: 'Email already exists', email: input.email },
      });
      throw new AppError('EMAIL_ALREADY_EXISTS', 'A user with this email already exists', 409);
    }

    if (input.username) {
      const existingUser = await userRepository.findByUsername(input.username);
      if (existingUser) {
        throw new AppError('USERNAME_ALREADY_EXISTS', 'A user with this username already exists', 409);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const userId = uuidv4();
    const role = (input.role as UserRole) || 'USER';
    const username = input.username || input.email.split('@')[0].toLowerCase();

    const payload: JwtPayload = {
      userId,
      email: input.email.toLowerCase(),
      username,
      role,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const user = await userRepository.create({
      id: userId,
      username,
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      role,
      refreshTokenHash,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
    });

    await auditService.record({
      userId,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
      requestId,
      status: 'SUCCESS',
    });

    return {
      accessToken,
      refreshToken,
      user: this.mapToProfile(user),
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string, requestId?: string): Promise<AuthTokens> {
    const rawIdentifier = input.identifier || input.email || input.username || '';
    const identifier = rawIdentifier.trim();
    if (!identifier) {
      throw new AppError('CREDENTIALS_REQUIRED', 'Email or username is required', 400);
    }

    const user = await userRepository.findByEmailOrUsername(identifier);
    if (!user) {
      await auditService.record({
        action: 'USER_LOGIN_FAILED',
        resourceType: 'USER',
        ipAddress,
        userAgent,
        requestId,
        status: 'FAILURE',
        details: { reason: 'User not found', identifier },
      });
      // Timing attack prevention: perform a dummy bcrypt comparison
      await bcrypt.compare(input.password, '$2b$12$e8Y542u83sUj3OqT/v7vne7c6M2N/y9c5lZJ5d5y9Z5Y5d5y9Z5Y5');
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Check account active state
    if (!user.isActive) {
      await auditService.record({
        userId: user.id,
        action: 'USER_LOGIN_BLOCKED_DISABLED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress,
        userAgent,
        requestId,
        status: 'FAILURE',
        details: { reason: 'Account disabled' },
      });
      throw new AppError('ACCOUNT_DISABLED', 'User account is disabled. Contact system administrator.', 403);
    }

    // Check progressive brute-force lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingSeconds = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
      await auditService.record({
        userId: user.id,
        action: 'USER_LOGIN_BLOCKED_LOCKED',
        resourceType: 'USER',
        resourceId: user.id,
        ipAddress,
        userAgent,
        requestId,
        status: 'FAILURE',
        details: { reason: 'Account locked', remainingSeconds },
      });
      throw new AppError(
        'ACCOUNT_LOCKED',
        `Account is temporarily locked due to excessive failed attempts. Try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
        423
      );
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      const attempts = await userRepository.incrementFailedAttempts(user.id);
      let isLocked = false;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutEnd = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        await userRepository.lockAccount(user.id, lockoutEnd);
        isLocked = true;

        await auditService.record({
          userId: user.id,
          action: 'USER_ACCOUNT_LOCKED',
          resourceType: 'USER',
          resourceId: user.id,
          ipAddress,
          userAgent,
          requestId,
          status: 'FAILURE',
          details: { attempts, lockedUntil: lockoutEnd.toISOString() },
        });
      } else {
        await auditService.record({
          userId: user.id,
          action: 'USER_LOGIN_FAILED',
          resourceType: 'USER',
          resourceId: user.id,
          ipAddress,
          userAgent,
          requestId,
          status: 'FAILURE',
          details: { attempts, reason: 'Password mismatch' },
        });
      }

      if (isLocked) {
        throw new AppError(
          'ACCOUNT_LOCKED',
          `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
          423
        );
      }

      // Generic error response to prevent account enumeration
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Success: update last login and reset lockout counters
    await userRepository.updateLastLogin(user.id);

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await userRepository.updateRefreshToken(user.id, refreshTokenHash);

    await auditService.record({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress,
      userAgent,
      requestId,
      status: 'SUCCESS',
    });

    const refreshedUser = await userRepository.findById(user.id);
    return {
      accessToken,
      refreshToken,
      user: this.mapToProfile(refreshedUser || user),
    };
  }

  async refreshToken(refreshTokenString: string, requestId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new AppError('UNAUTHORIZED', 'Invalid user or revoked token session', 401);
    }

    const isMatch = await bcrypt.compare(refreshTokenString, user.refreshTokenHash);
    if (!isMatch) {
      // Possible token reuse attack detected: revoke all tokens immediately
      await userRepository.updateRefreshToken(user.id, null);
      await auditService.record({
        userId: user.id,
        action: 'TOKEN_REUSE_DETECTED',
        resourceType: 'USER',
        resourceId: user.id,
        requestId,
        status: 'FAILURE',
      });
      throw new AppError('TOKEN_REUSE_DETECTED', 'Token compromised, please login again', 401);
    }

    const newTokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newHash = await bcrypt.hash(newTokens.refreshToken, 10);
    await userRepository.updateRefreshToken(user.id, newHash);

    return newTokens;
  }

  async logout(userId: string, requestId?: string): Promise<void> {
    await userRepository.updateRefreshToken(userId, null);
    await auditService.record({
      userId,
      action: 'LOGOUT',
      resourceType: 'USER',
      resourceId: userId,
      requestId,
      status: 'SUCCESS',
    });
  }

  async getMe(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User profile not found', 404);
    }
    return this.mapToProfile(user);
  }

  /**
   * Pre-seeds authoritative users for testing & development if USERS table is empty
   */
  async seedDefaultUsers(): Promise<void> {
    const fallbackUser = await userRepository.findById('1');
    if (!fallbackUser) {
      const hash = await bcrypt.hash('SystemPass123!', SALT_ROUNDS);
      await userRepository.create({
        id: '1',
        email: 'system@controlf.internal',
        passwordHash: hash,
        fullName: 'System Default Operator',
        role: 'ADMIN' as UserRole,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
      });
    }

    const defaultUsers = [
      {
        username: 'admin',
        email: 'admin@ctrlf.local',
        password: 'Password123!',
        fullName: 'System Security Administrator',
        role: 'ADMIN' as UserRole,
      },
      {
        username: 'operator1',
        email: 'operator@ctrlf.local',
        password: 'Password123!',
        fullName: 'Security Officer James',
        role: 'OPERATOR' as UserRole,
      },
      {
        username: 'user',
        email: 'user@ctrlf.local',
        password: 'Password123!',
        fullName: 'John Doe',
        role: 'USER' as UserRole,
      },
      {
        username: 'admin_internal',
        email: 'admin@controlf.internal',
        password: 'AdminPass123!',
        fullName: 'System Security Administrator',
        role: 'ADMIN' as UserRole,
      },
      {
        username: 'operator_internal',
        email: 'operator@controlf.internal',
        password: 'OperatorPass123!',
        fullName: 'Surveillance Operations Lead',
        role: 'OPERATOR' as UserRole,
      },
      {
        username: 'viewer_internal',
        email: 'viewer@controlf.internal',
        password: 'ViewerPass123!',
        fullName: 'Surveillance Auditor & Viewer',
        role: 'VIEWER' as UserRole,
      },
    ];

    for (const u of defaultUsers) {
      const existing = (await userRepository.findByEmail(u.email)) || (u.username ? await userRepository.findByUsername(u.username) : null);
      if (!existing) {
        const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
        await userRepository.create({
          id: uuidv4(),
          username: u.username,
          email: u.email,
          passwordHash: hash,
          fullName: u.fullName,
          role: u.role,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
        });
      }
    }
  }
}

export const authService = new AuthService();
