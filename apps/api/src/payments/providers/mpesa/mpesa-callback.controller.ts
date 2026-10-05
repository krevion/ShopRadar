import { Body, Controller, Post, Query } from '@nestjs/common';
import { PaymentsService } from '../../payments.service';

@Controller('payments/mpesa')
export class MpesaCallbackController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('callback')
  handleCallback(@Query('token') token: string | undefined, @Body() body: unknown) {
    return this.paymentsService.handleMpesaCallback(token ?? '', body);
  }
}
