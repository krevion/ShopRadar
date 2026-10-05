import { Controller, Get, Module, Query } from '@nestjs/common';

const products = [
  { id: 'p1', name: 'Fresh Mangoes', category: 'Groceries', price: 180, stock: 24, rating: 4.8, shop: 'Fresh Harvest' },
  { id: 'p2', name: 'Smart LED Bulb', category: 'Home', price: 860, stock: 16, rating: 4.5, shop: 'Smart Home Kenya' },
  { id: 'p3', name: 'Organic Rice', category: 'Groceries', price: 520, stock: 38, rating: 4.7, shop: 'Fresh Harvest' },
  { id: 'p4', name: 'Bluetooth Speaker', category: 'Electronics', price: 4300, stock: 9, rating: 4.9, shop: 'Mia Essentials' }
];

class ProductsService {
  findAll(query?: string) {
    const normalizedQuery = (query ?? '').trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery) ||
      product.shop.toLowerCase().includes(normalizedQuery)
    );
  }

  getFeatured() {
    return products.slice(0, 3);
  }
}

@Controller('products')
class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.productsService.findAll(q);
  }

  @Get('featured')
  getFeatured() {
    return this.productsService.getFeatured();
  }
}

@Module({
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
