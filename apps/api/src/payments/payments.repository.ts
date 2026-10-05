export class PaymentsRepository {
  async findById(id: string) {
    return {
      id,
      status: 'pending',
      provider: 'mpesa'
    };
  }
}
