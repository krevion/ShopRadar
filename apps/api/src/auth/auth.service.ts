import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { hashPassword, verifyPassword } from '@shopradar/auth';
import { PrismaService } from '../common/prisma.service';
import { FailedLoginLimiter } from '../common/failed-login-limiter';
import { apiConfig } from '../config/env';
import { USER_TOKEN_AUDIENCE, USER_TOKEN_ISSUER } from './token-claims';

@Injectable()
export class AuthService {
  private readonly loginLimiter = new FailedLoginLimiter(10, 15 * 60 * 1000);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async register(email: string, password: string, role: string = 'CUSTOMER') {
    if (role !== 'CUSTOMER' && role !== 'SELLER') {
      throw new BadRequestException('Public registration is available for customer and seller accounts only.');
    }
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Registration is temporarily unavailable because the database is offline.');
    }

    const passwordHash = await hashPassword(password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          role: role as Role
        }
      });
      return this.buildAuthResponse(user);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }
  }

  async login(email: string, password: string, ip: string) {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Sign in is temporarily unavailable because the database is offline.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    this.loginLimiter.assertAllowed(ip);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.active || !(await verifyPassword(password, user.passwordHash))) {
      this.loginLimiter.recordFailure(ip);
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.loginLimiter.clear(ip);
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: { id: string; email: string; role: string }) {
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: apiConfig.jwtSecret,
        algorithm: 'HS256',
        issuer: USER_TOKEN_ISSUER,
        audience: USER_TOKEN_AUDIENCE,
        expiresIn: apiConfig.jwtExpiresIn as `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`
      }
    );

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: token
    };
  }
}
