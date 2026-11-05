import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { HttpError } from './session.service';
import { LoginSchema, RegisterSchema } from '../dto/auth.dto';

const prisma = new PrismaClient();

export class AuthService {
  async login(data: any) {
    const { email, password } = LoginSchema.parse(data);

    const user = await prisma.user.findUnique({ where: { email } });
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
    const { email, password, firstName, lastName } = RegisterSchema.parse(data);

    const existingUser = await prisma.user.findUnique({ where: { email } });
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