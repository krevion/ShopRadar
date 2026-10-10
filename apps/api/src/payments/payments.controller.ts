import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import type { Request } from 'express';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { apiConfig } from '../config/env';
import { PaymentsService } from './payments.service';

class InitiateSubscriptionPaymentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^254\d{9}$/)
  phoneNumber!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('status')
  getStatus() {
    return { enabled: apiConfig.paymentsEnabled };
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  initiateSubscription(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body() body: InitiateSubscriptionPaymentDto
  ) {
    return this.paymentsService.initiateSubscriptionPayment(request.user, body.phoneNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    if (!id.trim()) {
      throw new BadRequestException('Payment id is required.');
    }
    return this.paymentsService.getPaymentById(id, request.user);
  }
}
