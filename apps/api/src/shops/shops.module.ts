import { Controller, Get, Module } from '@nestjs/common';

const shops = [
  { id: 's1', name: 'Fresh Harvest', city: 'Nairobi', distance: 2.4, rating: 4.8, specialty: 'Groceries & produce', verified: true },
  { id: 's2', name: 'Smart Home Kenya', city: 'Nairobi', distance: 6.1, rating: 4.7, specialty: 'Home & electronics', verified: true },
  { id: 's3', name: 'Mia Essentials', city: 'Nairobi', distance: 3.2, rating: 4.9, specialty: 'Beauty & daily needs', verified: true },
  { id: 's4', name: 'Kisumu Tech Hub', city: 'Kisumu', distance: 7.1, rating: 4.6, specialty: 'Electronics', verified: false }
];

class ShopsService {
  findAll() {
    return shops;
  }

  findNearby() {
    return shops.filter((shop) => shop.distance <= 7);
  }
}

@Controller('shops')
class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  findAll() {
    return this.shopsService.findAll();
  }

  @Get('nearby')
  findNearby() {
    return this.shopsService.findNearby();
  }
}

@Module({
  controllers: [ShopsController],
  providers: [ShopsService]
})
export class ShopsModule {}
