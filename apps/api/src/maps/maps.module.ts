import { Controller, Get, Module } from '@nestjs/common';

const nearbyLocations = [
  { id: 'm1', name: 'Westlands Market', distanceKm: 1.8 },
  { id: 'm2', name: 'Kilimani Plaza', distanceKm: 3.1 },
  { id: 'm3', name: 'Kibera Corner', distanceKm: 4.2 }
];

class MapsService {
  getNearbyLocations() {
    return nearbyLocations;
  }
}

@Controller('maps')
class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('nearby')
  getNearbyLocations() {
    return this.mapsService.getNearbyLocations();
  }
}

@Module({
  controllers: [MapsController],
  providers: [MapsService]
})
export class MapsModule {}
