import { Controller, Get, Module } from '@nestjs/common';

const plans = [
  {
    id: 'seller-business-monthly',
    name: 'ShopRadar seller subscription',
    price: 1000,
    currency: 'KES',
    billing: 'KSh 1,000 for 30 days',
    features: [
      'Register a shop or individual service provider profile',
      'Get discovered by shoppers and people looking for local services',
      'Promote your business or services with videos up to 2 minutes 30 seconds',
      'One-month free trial for new seller profiles (30 days from registration)',
      'Valid for 30 days after M-Pesa confirms your KSh 1,000 payment',
      'Profile approval is reviewed separately before public discovery'
    ]
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
