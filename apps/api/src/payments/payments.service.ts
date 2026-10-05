import { BadGatewayException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';
import { mpesaConfig } from '../config/env';
import { MpesaService } from './providers/mpesa/mpesa.service';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly prisma: PrismaService
  ) {}

  async initiatePayment(payload: { phoneNumber: string; amount: number; accountReference?: string }) {
    return this.mpesaService.initiateStkPush({
      phoneNumber: payload.phoneNumber,
      amount: payload.amount,
      accountReference: payload.accountReference ?? 'ShopRadar',
      transactionDescription: 'ShopRadar subscription payment'
    });
  }

  async initiateSubscriptionPayment(user: AuthenticatedUser, phoneNumber: string) {
    if (user.role !== 'SELLER') {
      throw new ForbiddenException('A seller account is required to pay for a seller subscription.');
    }
    if (!this.prisma.databaseAvailable) {
      throw new BadGatewayException('Seller subscriptions are unavailable while the database is offline.');
    }
    const account = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { role: true, active: true } });
    if (!account?.active || account.role !== 'SELLER') {
      throw new ForbiddenException('This seller account is not active.');
    }

    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId: user.sub } });
    if (!seller) {
      throw new ForbiddenException('Register a seller profile before starting a subscription payment.');
    }

    const callbackToken = randomBytes(32).toString('hex');
    const payment = await this.prisma.payment.create({
      data: {
        userId: user.sub,
        provider: 'mpesa',
        amount: 1000,
        status: 'PENDING',
        reference: randomUUID(),
        callbackToken: this.hashCallbackToken(callbackToken)
      }
    });

    try {
      const callbackUrl = new URL(mpesaConfig.callbackUrl);
      callbackUrl.searchParams.set('token', callbackToken);
      const response = await this.mpesaService.initiateStkPush({
        phoneNumber,
        amount: 1000,
        accountReference: seller.shopName.slice(0, 12),
        transactionDescription: 'ShopRadar seller subscription',
        callbackUrl: callbackUrl.toString()
      });
      const checkoutRequestId = this.readCheckoutRequestId(response);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerReference: checkoutRequestId }
      });

      return { id: payment.id, status: 'PENDING' as const };
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });
      this.logger.error(
        'Unable to start seller subscription payment.',
        error instanceof Error ? error.stack : String(error)
      );
      throw new BadGatewayException('The payment request could not be started. Please try again.');
    }
  }

  async getPaymentById(id: string, user: AuthenticatedUser) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, userId: user.sub },
      select: { id: true, status: true, amount: true, provider: true, createdAt: true }
    });

    if (!payment) {
      throw new NotFoundException('Payment was not found.');
    }

    return { ...payment, amount: Number(payment.amount) };
  }

  async handleMpesaCallback(token: string, body: unknown) {
    if (!/^[a-f\d]{64}$/i.test(token)) {
      throw new ForbiddenException('The payment callback token is invalid.');
    }

    const payment = await this.prisma.payment.findUnique({ where: { callbackToken: this.hashCallbackToken(token) } });
    if (!payment || payment.provider !== 'mpesa' || payment.orderId !== null) {
      throw new NotFoundException('The subscription payment was not found.');
    }

    const callback = this.getCallback(body);
    if (payment.providerReference && payment.providerReference !== callback.checkoutRequestId) {
      throw new ForbiddenException('The payment callback does not match this payment.');
    }

    if (payment.status !== 'PENDING') {
      return { received: true, status: payment.status };
    }

    if (callback.resultCode !== 0) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', providerReference: callback.checkoutRequestId }
      });
      return { received: true, status: 'FAILED' };
    }

    if (callback.amount !== Number(payment.amount)) {
      throw new ForbiddenException('The payment callback amount does not match the requested amount.');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESSFUL',
        providerReference: callback.checkoutRequestId,
        receipt: callback.receipt
      }
    });

    return { received: true, status: updated.status };
  }

  private readCheckoutRequestId(response: unknown): string {
    if (typeof response === 'object' && response !== null && 'CheckoutRequestID' in response) {
      const id = response.CheckoutRequestID;
      if (typeof id === 'string' && id.length > 0) {
        return id;
      }
    }
    throw new Error('The payment provider did not return a checkout request ID.');
  }

  private hashCallbackToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getCallback(body: unknown): { checkoutRequestId: string; resultCode: number; amount: number; receipt?: string } {
    if (!isRecord(body) || !('Body' in body)) {
      throw new ForbiddenException('The payment callback payload is invalid.');
    }

    const callbackBody = body.Body;
    if (!isRecord(callbackBody) || !('stkCallback' in callbackBody)) {
      throw new ForbiddenException('The payment callback payload is invalid.');
    }

    const callback = callbackBody.stkCallback;
    if (!isRecord(callback)) {
      throw new ForbiddenException('The payment callback payload is invalid.');
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;
    if (typeof CheckoutRequestID !== 'string' || typeof ResultCode !== 'number' || !Number.isInteger(ResultCode)) {
      throw new ForbiddenException('The payment callback payload is invalid.');
    }

    let amount = 0;
    let receipt: string | undefined;
    if (isRecord(CallbackMetadata) && Array.isArray(CallbackMetadata.Item)) {
      for (const item of CallbackMetadata.Item) {
        if (!isRecord(item) || !('Name' in item) || !('Value' in item)) {
          continue;
        }
        if (item.Name === 'Amount' && typeof item.Value === 'number') {
          amount = item.Value;
        }
        if (item.Name === 'MpesaReceiptNumber' && typeof item.Value === 'string') {
          receipt = item.Value;
        }
      }
    }

    return { checkoutRequestId: CheckoutRequestID, resultCode: ResultCode, amount, receipt };
  }
}
