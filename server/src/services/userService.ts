import { userRepository } from '../repositories/userRepository';
import { AppError } from '../middleware/errorHandler';
import { UserProfile, ROLE_PERMISSIONS } from '../types/user';

export class UserService {
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User account not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}

export const userService = new UserService();
