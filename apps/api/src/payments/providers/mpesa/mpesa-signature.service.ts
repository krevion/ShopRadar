export class MpesaSignatureService {
  verifySignature(payload: unknown, signature: string): boolean {
    if (!signature || !payload) {
      return false;
    }

    return typeof signature === 'string' && signature.length > 0;
  }
}
