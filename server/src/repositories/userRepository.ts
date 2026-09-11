import { db } from '../config/database';
import { User } from '../types/user';

interface UserRow {
  ID?: string | number;
  USER_ID?: string | number;
  USERNAME?: string | null;
  EMAIL: string;
  PASSWORD_HASH: string;
  FULL_NAME?: string | null;
  ROLE: string;
  REFRESH_TOKEN_HASH?: string | null;
  IS_ACTIVE?: number | boolean;
  LAST_LOGIN_AT?: Date | string | null;
  LAST_LOGIN?: Date | string | null;
  FAILED_LOGIN_ATTEMPTS?: number;
  LOCKED_UNTIL?: Date | string | null;
  CREATED_AT: Date | string;
  UPDATED_AT: Date | string;
}

export class UserRepository {
  private mapRowToUser(row: UserRow): User {
    const id = String(row.USER_ID ?? row.ID);
    const lastLogin = row.LAST_LOGIN || row.LAST_LOGIN_AT;
    const email = row.EMAIL;
    const username = row.USERNAME || email.split('@')[0];

    return {
      id,
      username,
      email,
      passwordHash: row.PASSWORD_HASH,
      fullName: row.FULL_NAME || username || 'User',
      role: row.ROLE as User['role'],
      refreshTokenHash: row.REFRESH_TOKEN_HASH || null,
      isActive: row.IS_ACTIVE === undefined ? true : (row.IS_ACTIVE === 1 || row.IS_ACTIVE === true),
      lastLoginAt: lastLogin ? new Date(lastLogin) : null,
      failedLoginAttempts: Number(row.FAILED_LOGIN_ATTEMPTS || 0),
      lockedUntil: row.LOCKED_UNTIL ? new Date(row.LOCKED_UNTIL) : null,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    const sql = `
      SELECT id, user_id, username, email, password_hash, full_name, role, refresh_token_hash,
             is_active, last_login_at, last_login, failed_login_attempts, locked_until, created_at, updated_at
      FROM USERS
      WHERE LOWER(email) = :cleanEmail
    `;
    const result = await db.execute<UserRow>(sql, { cleanEmail });

    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToUser(result.rows[0]);
  }

  async findByUsername(username: string): Promise<User | null> {
    const cleanUsername = username.trim().toLowerCase();
    const sql = `
      SELECT id, user_id, username, email, password_hash, full_name, role, refresh_token_hash,
             is_active, last_login_at, last_login, failed_login_attempts, locked_until, created_at, updated_at
      FROM USERS
      WHERE LOWER(username) = :cleanUsername
    `;
    try {
      const result = await db.execute<UserRow>(sql, { cleanUsername });
      if (result.rows && result.rows.length > 0) {
        return this.mapRowToUser(result.rows[0]);
      }
    } catch {
      // ignore
    }
    return null;
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const clean = identifier.trim().toLowerCase();

    // Direct mapping for common seed identifiers and administrator accounts
    const aliases: Record<string, string> = {
      'operator1': 'operator@ctrlf.local',
      'operator': 'operator@ctrlf.local',
      'admin': 'admin@ctrlf.local',
      'user': 'user@ctrlf.local',
      'nikhil': 'nikhilguptha07@gmail.com',
      'nikhilguptha': 'nikhilguptha07@gmail.com',
      'nikhilguptha07': 'nikhilguptha07@gmail.com',
    };
    if (aliases[clean]) {
      const byAlias = await this.findByEmail(aliases[clean]);
      if (byAlias) return byAlias;
    }

    const byEmail = await this.findByEmail(clean);
    if (byEmail) return byEmail;

    const byUser = await this.findByUsername(clean);
    if (byUser) return byUser;

    const sql = `
      SELECT id, user_id, username, email, password_hash, full_name, role, refresh_token_hash,
             is_active, last_login_at, last_login, failed_login_attempts, locked_until, created_at, updated_at
      FROM USERS
      WHERE LOWER(email) = :clean
         OR LOWER(username) = :clean
         OR LOWER(email) LIKE :prefix
    `;
    try {
      const result = await db.execute<UserRow>(sql, { clean, prefix: `${clean}%` });
      if (result.rows && result.rows.length > 0) {
        return this.mapRowToUser(result.rows[0]);
      }
    } catch {
      // ignore
    }

    return null;
  }

  async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT id, user_id, username, email, password_hash, full_name, role, refresh_token_hash,
             is_active, last_login_at, last_login, failed_login_attempts, locked_until, created_at, updated_at
      FROM USERS
      WHERE id = :id
    `;
    const result = await db.execute<UserRow>(sql, { id });

    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToUser(result.rows[0]);
  }

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const username = (user.username || user.email.split('@')[0]).trim().toLowerCase();
    const sql = `
      INSERT INTO USERS (
        id, username, email, password_hash, full_name, role, refresh_token_hash,
        is_active, failed_login_attempts, locked_until
      )
      VALUES (
        :id, :username, :email, :passwordHash, :fullName, :role, :refreshTokenHash,
        :isActive, :failedLoginAttempts, :lockedUntil
      )
    `;
    await db.execute(sql, {
      id: user.id,
      username,
      email: user.email.trim().toLowerCase(),
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      role: user.role,
      refreshTokenHash: user.refreshTokenHash || null,
      isActive: user.isActive ? 1 : 0,
      failedLoginAttempts: user.failedLoginAttempts || 0,
      lockedUntil: user.lockedUntil || null,
    });

    const created = await this.findById(user.id);
    if (!created) {
      throw new Error('User creation failed');
    }
    return created;
  }

  async updateRefreshToken(userId: string, refreshTokenHash: string | null): Promise<void> {
    const sql = `
      UPDATE USERS
      SET refresh_token_hash = :refreshTokenHash, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    await db.execute(sql, {
      id: userId,
      refreshTokenHash: refreshTokenHash || null,
    });
  }

  async incrementFailedAttempts(userId: string): Promise<number> {
    const user = await this.findById(userId);
    const newCount = (user?.failedLoginAttempts || 0) + 1;
    const sql = `
      UPDATE USERS
      SET failed_login_attempts = :attempts, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    await db.execute(sql, { id: userId, attempts: newCount });
    return newCount;
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    const sql = `
      UPDATE USERS
      SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    await db.execute(sql, { id: userId });
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
    const sql = `
      UPDATE USERS
      SET locked_until = :lockedUntil, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    await db.execute(sql, { id: userId, lockedUntil });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const sql = `
      UPDATE USERS
      SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;
    await db.execute(sql, { id: userId });
  }

  async findAll(limit = 100): Promise<User[]> {
    const sql = `
      SELECT id, user_id, username, email, password_hash, full_name, role, refresh_token_hash,
             is_active, last_login_at, last_login, failed_login_attempts, locked_until, created_at, updated_at
      FROM USERS
      ORDER BY created_at DESC
    `;
    const result = await db.execute<UserRow>(sql);
    const rows = result.rows || [];
    return rows.slice(0, limit).map((r) => this.mapRowToUser(r));
  }

  async updateUser(
    id: string,
    updates: { role?: User['role']; isActive?: boolean; fullName?: string; passwordHash?: string }
  ): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const binds: Record<string, unknown> = { id };

    if (updates.role !== undefined) {
      setClauses.push('role = :role');
      binds.role = updates.role;
    }
    if (updates.isActive !== undefined) {
      setClauses.push('is_active = :isActive');
      binds.isActive = updates.isActive ? 1 : 0;
    }
    if (updates.fullName !== undefined) {
      setClauses.push('full_name = :fullName');
      binds.fullName = updates.fullName;
    }
    if (updates.passwordHash !== undefined) {
      setClauses.push('password_hash = :passwordHash');
      binds.passwordHash = updates.passwordHash;
    }

    const sql = `
      UPDATE USERS
      SET ${setClauses.join(', ')}
      WHERE id = :id
    `;
    await db.execute(sql, binds);
    return this.findById(id);
  }

  async countAdmins(): Promise<number> {
    const all = await this.findAll(1000);
    return all.filter((u) => u.role === 'ADMIN' && u.isActive).length;
  }

  async countTotal(): Promise<number> {
    const all = await this.findAll(5000);
    return all.length;
  }
}

export const userRepository = new UserRepository();
