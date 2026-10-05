export class ReconciliationService {
  async reconcile() {
    return {
      reconciled: 0,
      status: 'not_started',
      message: 'Reconciliation service placeholder. Hook to ledger and payment logs later.'
    };
  }
}
