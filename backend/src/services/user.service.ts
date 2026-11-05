import { PrismaClient } from '@prisma/client';
import { HttpError } from './session.service';

const prisma = new PrismaClient();

export class UserService {
  async getById(idStr: string) {
    if (!idStr) throw new HttpError(400, 'User ID is required');
    const userId = parseInt(idStr);
    if (isNaN(userId)) throw new HttpError(400, 'Invalid user ID');

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new HttpError(404, 'User not found');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async delete(idStr: string, currentUserId: number) {
    if (!idStr) throw new HttpError(400, 'User ID is required');
    const userId = parseInt(idStr);
    if (isNaN(userId)) throw new HttpError(400, 'Invalid user ID');

    if (currentUserId !== userId) {
      throw new HttpError(403, 'You can only delete your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new HttpError(404, 'User not found');

    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  async promoteSelfToAdmin(currentUserId: number) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) throw new HttpError(403, 'Admin self-promotion is only available in development');
    
    if (!currentUserId) throw new HttpError(401, 'Unauthorized');

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) throw new HttpError(404, 'User not found');

    if (user.admin) {
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        admin: user.admin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { admin: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      admin: updatedUser.admin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}

export const userService = new UserService();