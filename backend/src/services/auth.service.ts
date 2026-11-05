import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { HttpError } from './session.service';

const prisma = new PrismaClient();

export class AuthService {
  async login(data: any) {
    const { email, password } = data;

    if (!email) throw new HttpError(400, 'Email is required');
    if (!password) throw new HttpError(400, 'Password is required');
    if (typeof email !== 'string') throw new HttpError(400, 'Email must be a string');
    if (typeof password !== 'string') throw new HttpError(400, 'Password must be a string');

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new HttpError(401, 'Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new HttpError(401, 'Invalid credentials');

    const token = generateToken(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };
  }

  async register(data: any) {
    const { email, password, firstName, lastName } = data;

    if (!email) throw new HttpError(400, 'Email is required');
    if (!password) throw new HttpError(400, 'Password is required');
    if (!firstName) throw new HttpError(400, 'First name is required');
    if (!lastName) throw new HttpError(400, 'Last name is required');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) throw new HttpError(400, 'Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        admin: false,
      },
    });

    const token = generateToken(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };
  }
}

export const authService = new AuthService();