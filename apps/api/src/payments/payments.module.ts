import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MpesaService } from './providers/mpesa/mpesa.service';
import { MpesaCallbackController } from './providers/mpesa/mpesa-callback.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';

@Module({
  controllers: [PaymentsController, MpesaCallbackController],
  providers: [PaymentsService, PaymentsRepository, MpesaService, JwtAuthGuard],
  exports: [PaymentsService]
})
export class PaymentsModule {}
