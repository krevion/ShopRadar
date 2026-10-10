import { Controller, Get, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    if (!this.prisma.databaseAvailable) throw new ServiceUnavailableException('Categories are unavailable while the database is offline.');
    const categories = await this.prisma.product.findMany({
      where: { isActive: true, shop: { is: { isActive: true, seller: { is: { status: 'APPROVED', isVerified: true } } } } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    return categories.map(({ category }) => ({ id: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: category }));
  }
}

@Controller('categories')
class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
}

@Module({ controllers: [CategoriesController], providers: [CategoriesService] })
export class CategoriesModule {}
