import { BadRequestException, Controller, Get, Injectable, Module, Query, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
class MapsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNearbyLocations(latitude?: string, longitude?: string, radius?: string) {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Shop locations are unavailable while the database is offline.');
    const shops = await this.prisma.shop.findMany({
      where: {
        isActive: true,
        seller: {
          is: {
            status: 'APPROVED',
            isVerified: true,
            ...(latitude !== undefined || longitude !== undefined ? { latitude: { not: null }, longitude: { not: null } } : {})
          }
        }
      },
      include: { seller: { select: { latitude: true, longitude: true, locationLabel: true, buildingName: true, roomNumber: true, street: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300
    });

    if (latitude === undefined && longitude === undefined) {
      return shops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        locationLabel: shop.seller.locationLabel,
        buildingName: shop.seller.buildingName,
        roomNumber: shop.seller.roomNumber,
        street: shop.seller.street,
        latitude: shop.seller.latitude,
        longitude: shop.seller.longitude,
        distanceKm: null
      }));
    }
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
      .filter((shop): shop is typeof shop & { seller: { latitude: number; longitude: number; locationLabel: string | null; buildingName: string | null; roomNumber: string | null; street: string | null } } =>
        typeof shop.seller.latitude === 'number' && typeof shop.seller.longitude === 'number'
      )
      .map((shop) => ({
        id: shop.id,
        name: shop.name,
        locationLabel: shop.seller.locationLabel,
        buildingName: shop.seller.buildingName,
        roomNumber: shop.seller.roomNumber,
        street: shop.seller.street,
        latitude: shop.seller.latitude,
        longitude: shop.seller.longitude,
        distanceKm: distanceKm(lat, lon, shop.seller.latitude, shop.seller.longitude)
      }))
      .filter((shop) => shop.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

@Controller('maps')
class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('nearby')
  getNearbyLocations(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radius?: string
  ) {
    return this.mapsService.getNearbyLocations(latitude, longitude, radius);
  }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lon2 - lon1);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Module({ controllers: [MapsController], providers: [MapsService] })
export class MapsModule {}
