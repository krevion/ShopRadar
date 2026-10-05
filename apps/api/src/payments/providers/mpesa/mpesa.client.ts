export class MpesaClient {
  async generateToken() {
    return {
      access_token: 'placeholder-token',
      expires_in: 3600
    };
  }

  async stkPush() {
    return {
      MerchantRequestID: 'placeholder-request-id',
      CheckoutRequestID: 'placeholder-checkout-id',
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted.'
    };
  }
}
