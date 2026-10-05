export type UserRole = 'customer' | 'seller' | 'admin';

export type SubscriptionStatus =
  | 'INACTIVE'
  | 'TRIAL'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED';
