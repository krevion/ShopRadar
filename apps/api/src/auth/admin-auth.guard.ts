import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AuthenticatedUser } from './jwt-auth.guard';
import { ADMIN_TOKEN_AUDIENCE, ADMIN_TOKEN_ISSUER, ADMIN_TOKEN_TTL_SECONDS } from './token-claims';

type AdminRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store, private');
    response.setHeader('Pragma', 'no-cache');
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) throw new UnauthorizedException('A valid bearer token is required.');

    let payload: AuthenticatedUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        algorithms: ['HS256'],
        issuer: ADMIN_TOKEN_ISSUER,
        audience: ADMIN_TOKEN_AUDIENCE
      });
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      payload.sub !== 'shopradar-configured-admin' ||
      payload.email !== 'site-owner@shopradar.local' ||
      payload.role !== 'ADMIN' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.iat > now ||
      payload.exp - payload.iat > ADMIN_TOKEN_TTL_SECONDS ||
      payload.iat < now - ADMIN_TOKEN_TTL_SECONDS
    ) {
      throw new UnauthorizedException('A valid site-owner admin session is required.');
    }

    request.user = payload;
    return true;
  }
}
