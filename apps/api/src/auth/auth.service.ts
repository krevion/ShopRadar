import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { hashPassword, verifyPassword } from '@shopradar/auth';
import { PrismaService } from '../common/prisma.service';
import { apiConfig } from '../config/env';

type AuthUser = {
  id: string;
  email: string;
  role: string;
  passwordHash: string;
};

@Injectable()
export class AuthService {
  private readonly users: AuthUser[] = [
    {
      id: 'demo-user-1',
      email: 'buyer@shopradar.test',
      role: 'CUSTOMER',
      passwordHash: '$2a$10$Z7C3A8xJ8lU0hMVzQ0/7VefLJxARbmQE9L8YgF4dN6w1mpjN8s.rG'
    }
  ];

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async register(email: string, password: string, role: string = 'CUSTOMER') {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (existing) {
        throw new ConflictException('A user with this email already exists.');
      }

      const passwordHash = await hashPassword(password);
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: role as Role
        }
      });

      return this.buildAuthResponse({
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.passwordHash
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      return this.registerFallback(email, password, role);
    }
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const validPassword = await verifyPassword(password, user.passwordHash);

      if (!validPassword) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      return this.buildAuthResponse({
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.passwordHash
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const fallbackUser = this.users.find((entry) => entry.email.toLowerCase() === normalizedEmail);

      if (!fallbackUser) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      const validPassword = await verifyPassword(password, fallbackUser.passwordHash);

      if (!validPassword) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      return this.buildAuthResponse(fallbackUser);
    }
  }

  private async registerFallback(email: string, password: string, role: string = 'CUSTOMER') {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.users.find((user) => user.email.toLowerCase() === normalizedEmail);

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const user: AuthUser = {
      id: `fallback-user-${Date.now()}`,
      email: normalizedEmail,
      role,
      passwordHash
    };

    this.users.push(user);
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: AuthUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const token = this.jwtService.sign(payload, { secret: apiConfig.jwtSecret, expiresIn: '7d' });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      accessToken: token
    };
  }
}
