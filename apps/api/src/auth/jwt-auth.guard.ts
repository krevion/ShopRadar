import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { USER_TOKEN_AUDIENCE, USER_TOKEN_ISSUER } from './token-claims';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  iat?: number;
  exp?: number;
};

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!token) {
      throw new UnauthorizedException('A valid bearer token is required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        algorithms: ['HS256'],
        issuer: USER_TOKEN_ISSUER,
        audience: USER_TOKEN_AUDIENCE
      });
      if (
        !payload.sub ||
        !payload.email ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number' ||
        (payload.role !== 'CUSTOMER' && payload.role !== 'SELLER')
      ) {
        throw new UnauthorizedException('The access token is invalid.');
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('The access token is invalid or expired.');
    }
  }
}
