import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { AuthenticatedUser } from './jwt-auth.guard';

type AdminRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) throw new UnauthorizedException('A valid bearer token is required.');

    let payload: AuthenticatedUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }

    if (!payload.sub || !payload.email) throw new UnauthorizedException('The access token is invalid.');
    if (!this.prisma.databaseAvailable) {
      throw new ServiceUnavailableException('Admin access cannot be verified while the database is offline.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, active: true }
    });
    if (!user?.active) throw new UnauthorizedException('This account is not active.');
    if (user.role !== 'ADMIN') throw new ForbiddenException('An admin account is required.');

    request.user = { sub: user.id, email: user.email, role: user.role };
    return true;
  }
}
