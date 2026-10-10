import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { apiConfig } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: apiConfig.jwtSecret,
      signOptions: { expiresIn: apiConfig.jwtExpiresIn as `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}` }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService]
})
export class AuthModule {}
