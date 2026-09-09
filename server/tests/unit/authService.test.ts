import { describe, it, expect, beforeAll } from 'vitest';
import { authService } from '../../src/services/authService';
import { db } from '../../src/config/database';

describe('AuthService Unit Tests', () => {
  beforeAll(async () => {
    await db.init();
  });

  const testEmail = `operator_${Date.now()}@controlf.internal`;
  const testPassword = 'Password123!';

  it('should register a new operator with bcrypt hash and JWT tokens', async () => {
    const result = await authService.register({
      email: testEmail,
      password: testPassword,
      fullName: 'Surveillance Officer',
      role: 'OPERATOR',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toEqual(testEmail);
    expect(result.user.role).toEqual('OPERATOR');
  });

  it('should prevent duplicate registration with same email', async () => {
    await expect(
      authService.register({
        email: testEmail,
        password: testPassword,
        fullName: 'Duplicate Officer',
      })
    ).rejects.toThrow('A user with this email already exists');
  });

  it('should successfully log in with valid credentials', async () => {
    const result = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toEqual(testEmail);
  });

  it('should reject login with incorrect password', async () => {
    await expect(
      authService.login({
        email: testEmail,
        password: 'WrongPassword!',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('should refresh access tokens with valid refresh token', async () => {
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });

    const refreshed = await authService.refreshToken(loginResult.refreshToken);
    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
  });
});
