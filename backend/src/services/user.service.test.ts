import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(function () {
    return mockPrisma;
  }),
}));

import { userService } from './user.service';

describe('UserService', () => {
  const mockUser = {
    id: 1,
    email: 'claire@studio.com',
    firstName: 'Claire',
    lastName: 'Martin',
    password: 'hashed_password',
    admin: false,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  };

  const expectedUserOutput = {
    id: 1,
    email: 'claire@studio.com',
    firstName: 'Claire',
    lastName: 'Martin',
    admin: false,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('getById', () => {
    it('should return user data without password when valid ID is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getById('1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(expectedUserOutput);
    });

    it('should throw 400 HttpError if ID is empty', async () => {
      await expect(userService.getById('')).rejects.toMatchObject({
        statusCode: 400,
        message: 'User ID is required',
      });
    });

    it('should throw 400 HttpError if ID is not a number', async () => {
      await expect(userService.getById('invalid')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid user ID',
      });
    });

    it('should throw 404 HttpError if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getById('99')).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });

  describe('delete', () => {
    it('should delete user when ID is valid and matches currentUserId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      const result = await userService.delete('1', 1);

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should throw 400 HttpError if ID is empty', async () => {
      await expect(userService.delete('', 1)).rejects.toMatchObject({
        statusCode: 400,
        message: 'User ID is required',
      });
    });

    it('should throw 400 HttpError if ID is not a number', async () => {
      await expect(userService.delete('abc', 1)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid user ID',
      });
    });

    it('should throw 403 HttpError if currentUserId does not match userId', async () => {
      await expect(userService.delete('1', 2)).rejects.toMatchObject({
        statusCode: 403,
        message: 'You can only delete your own account',
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw 404 HttpError if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.delete('1', 1)).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('promoteSelfToAdmin', () => {
    it('should promote a non-admin user to admin in development mode', async () => {
      delete process.env.NODE_ENV;
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, admin: true });

      const result = await userService.promoteSelfToAdmin(1);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { admin: true },
      });
      expect(result).toEqual({ ...expectedUserOutput, admin: true });
    });

    it('should return user directly without calling update if user is already admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, admin: true });

      const result = await userService.promoteSelfToAdmin(1);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ ...expectedUserOutput, admin: true });
    });

    it('should throw 403 HttpError when NODE_ENV is not development', async () => {
      process.env.NODE_ENV = 'production';

      await expect(userService.promoteSelfToAdmin(1)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Admin self-promotion is only available in development',
      });
    });

    it('should throw 401 HttpError if currentUserId is falsy (0)', async () => {
      await expect(userService.promoteSelfToAdmin(0)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should throw 404 HttpError if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.promoteSelfToAdmin(99)).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });
});