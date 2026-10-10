import { BadRequestException, Controller, Get, Injectable, Module, Query, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    this.requireDatabase();
    const shops = await this.prisma.shop.findMany({
      where: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } },
      include: { seller: { select: { latitude: true, longitude: true, locationLabel: true, buildingName: true, roomNumber: true, street: true, bio: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    return shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      city: shop.city,
      address: shop.address ?? shop.seller.locationLabel,
      buildingName: shop.seller.buildingName,
      roomNumber: shop.seller.roomNumber,
      street: shop.seller.street,
      locationLabel: shop.seller.locationLabel,
      latitude: shop.seller.latitude,
      longitude: shop.seller.longitude,
      specialty: shop.description ?? shop.seller.bio,
      verified: shop.seller.isVerified,
      distanceKm: null
    }));
  }

  async findNearby(latitude?: string, longitude?: string, radius?: string) {
    const shops = await this.findAll();
    if (latitude === undefined && longitude === undefined) return shops;
    const lat = Number(latitude);
    const lon = Number(longitude);
    const radiusKm = radius === undefined ? 25 : Number(radius);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new BadRequestException('Latitude and longitude must be valid map coordinates.');
    }
    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      throw new BadRequestException('Search radius must be greater than 0 and no more than 100 km.');
    }
    return shops
      .filter((shop): shop is typeof shop & { latitude: number; longitude: number } =>
        typeof shop.latitude === 'number' && typeof shop.longitude === 'number'
      )
      .map((shop) => ({ ...shop, distanceKm: distanceKm(lat, lon, shop.latitude, shop.longitude) }))
      .filter((shop) => shop.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private requireDatabase() {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Shop data is unavailable while the database is offline.');
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
  findNearby(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radius?: string
  ) {
    return this.shopsService.findNearby(latitude, longitude, radius);
  }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lon2 - lon1);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Module({
  controllers: [ShopsController],
  providers: [ShopsService]
})
export class ShopsModule {}
