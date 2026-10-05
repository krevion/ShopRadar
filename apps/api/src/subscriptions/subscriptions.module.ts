import { Controller, Get, Module } from '@nestjs/common';

const plans = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    currency: 'KES',
    billing: 'First month free',
    features: ['1 storefront', 'Basic merchant dashboard', 'National ID verification required']
  },
  {
    id: 'standard',
    name: 'Standard Seller',
    price: 1000,
    currency: 'KES',
    billing: 'KSh 1,000 per month',
    features: ['Unlimited listings', 'Insights dashboard', 'Trust and scam screening']
  },
  {
    id: 'growth',
    name: 'Growth Seller',
    price: 1000,
    currency: 'KES',
    billing: 'KSh 1,000 per month + promo support',
    features: ['Priority search placement', 'Campaign support', 'Verified business visibility']
  }
];

class SubscriptionsService {
  findAll() {
    return plans;
  }
}

@Controller('subscriptions')
class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }
}

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService]
})
export class SubscriptionsModule {}
