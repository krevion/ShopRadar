import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { hashPassword, verifyPassword } from '@shopradar/auth';
import { PrismaService } from '../common/prisma.service';
import { apiConfig } from '../config/env';

@Injectable()
export class AuthService {
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

  async login(email: string, password: string) {
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Sign in is temporarily unavailable because the database is offline.');
    }

    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user?.active || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: { id: string; email: string; role: string }) {
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: apiConfig.jwtSecret, expiresIn: apiConfig.jwtExpiresIn as `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}` }
    );

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: token
    };
  }
}
