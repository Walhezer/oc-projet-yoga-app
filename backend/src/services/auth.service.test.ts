import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function () {
        return mockPrisma;
    }),
}));

const mockBcrypt = vi.hoisted(() => ({
    compare: vi.fn(),
    hash: vi.fn(),
}));

vi.mock('bcrypt', () => mockBcrypt);

const mockJwt = vi.hoisted(() => ({
    generateToken: vi.fn().mockReturnValue('mock-jwt-token'),
}));

vi.mock('../utils/jwt.util', () => mockJwt);

const mockAuthDto = vi.hoisted(() => ({
    LoginSchema: {
        parse: vi.fn((data) => data),
    },
    RegisterSchema: {
        parse: vi.fn((data) => data),
    },
}));

vi.mock('../dto/auth.dto', () => mockAuthDto);

import { authService } from './auth.service';

describe('AuthService', () => {
    const mockUser = {
        id: 1,
        email: 'claire@studio.com',
        password: 'hashed_password_123',
        firstName: 'Claire',
        lastName: 'Martin',
        admin: false,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('should successfully log in a user with valid credentials and return a token', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockBcrypt.compare.mockResolvedValue(true);

            const result = await authService.login({ email: 'claire@studio.com', password: 'Password123!' });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'claire@studio.com' } });
            expect(mockBcrypt.compare).toHaveBeenCalledWith('Password123!', mockUser.password);
            expect(result).toEqual({
                id: 1,
                email: 'claire@studio.com',
                firstName: 'Claire',
                lastName: 'Martin',
                admin: false,
                token: 'mock-jwt-token',
            });
        });

        it('should throw 401 HttpError if user does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(
                authService.login({ email: 'unknown@studio.com', password: 'Password123!' })
            ).rejects.toMatchObject({
                statusCode: 401,
                message: 'Invalid credentials',
            });
            expect(mockBcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw 401 HttpError if password is invalid', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockBcrypt.compare.mockResolvedValue(false);

            await expect(
                authService.login({ email: 'claire@studio.com', password: 'WrongPassword' })
            ).rejects.toMatchObject({
                statusCode: 401,
                message: 'Invalid credentials',
            });
        });
    });

    describe('register', () => {
        it('should successfully register a new user and return user data with token', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockBcrypt.hash.mockResolvedValue('hashed_password_123');
            mockPrisma.user.create.mockResolvedValue(mockUser);

            const payload = {
                email: 'claire@studio.com',
                password: 'Password123!',
                firstName: 'Claire',
                lastName: 'Martin',
            };

            const result = await authService.register(payload);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: payload.email } });
            expect(mockBcrypt.hash).toHaveBeenCalledWith(payload.password, 10);
            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: payload.email,
                    password: 'hashed_password_123',
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    admin: false,
                },
            });
            expect(result).toEqual({
                id: 1,
                email: 'claire@studio.com',
                firstName: 'Claire',
                lastName: 'Martin',
                admin: false,
                token: 'mock-jwt-token',
            });
        });

        it('should throw 400 HttpError if email already exists', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            await expect(
                authService.register({
                    email: 'claire@studio.com',
                    password: 'Password123!',
                    firstName: 'Claire',
                    lastName: 'Martin',
                })
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'Email already exists',
            });
            expect(mockBcrypt.hash).not.toHaveBeenCalled();
            expect(mockPrisma.user.create).not.toHaveBeenCalled();
        });
    });
});