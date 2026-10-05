import { Injectable } from '@nestjs/common';
import { mpesaConfig } from '../../../config/env';

export type InitiateStkPushInput = {
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  transactionDescription?: string;
  callbackUrl?: string;
};

@Injectable()
export class MpesaService {
  private get baseUrl(): string {
    return mpesaConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async requestToken(): Promise<string> {
    const auth = Buffer.from(
      `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate M-Pesa access token: ${response.status}`);
    }

    const payload = (await response.json()) as { access_token?: string };

    if (!payload.access_token) {
      throw new Error('M-Pesa access token was not returned.');
    }

    return payload.access_token;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('Z', '');
  }

  async initiateStkPush(input: InitiateStkPushInput) {
    const phoneNumber = input.phoneNumber.replace(/\s+/g, '');
    const amount = Number(input.amount);

    if (!/^254\d{9}$/.test(phoneNumber)) {
      throw new Error('Phone number must be in the format 2547XXXXXXXX.');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number.');
    }

    const timestamp = this.getTimestamp();
    const password = Buffer.from(
      `${mpesaConfig.shortCode}${mpesaConfig.passKey}${timestamp}`
    ).toString('base64');

    const accessToken = await this.requestToken();

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          BusinessShortCode: mpesaConfig.shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: mpesaConfig.shortCode,
          PhoneNumber: phoneNumber,
          CallBackURL: input.callbackUrl ?? mpesaConfig.callbackUrl,
          AccountReference: input.accountReference ?? 'ShopRadar',
          TransactionDesc: input.transactionDescription ?? 'ShopRadar subscription payment'
        })
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        `M-Pesa STK push request failed: ${response.status} - ${JSON.stringify(payload)}`
      );
    }

    return payload;
  }
}
