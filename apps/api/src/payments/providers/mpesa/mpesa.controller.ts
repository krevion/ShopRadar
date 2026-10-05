import { Body, Controller, Post } from '@nestjs/common';
import { MpesaService } from './mpesa.service';

@Controller('mpesa')
export class MpesaController {
  constructor(private readonly mpesaService: MpesaService) {}

  @Post('stk-push')
  async initiateStkPush(@Body() body: { phoneNumber: string; amount: number }) {
    return this.mpesaService.initiateStkPush({
      phoneNumber: body.phoneNumber,
      amount: body.amount,
      accountReference: 'ShopRadar',
      transactionDescription: 'ShopRadar subscription payment'
    });
  }
}
