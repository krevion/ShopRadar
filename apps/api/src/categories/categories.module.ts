import { Controller, Get, Module } from '@nestjs/common';

const categories = [
  { id: 'c1', name: 'Groceries' },
  { id: 'c2', name: 'Electronics' },
  { id: 'c3', name: 'Home' },
  { id: 'c4', name: 'Beauty' },
  { id: 'c5', name: 'Fashion' }
];

class CategoriesService {
  findAll() {
    return categories;
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

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService]
})
export class CategoriesModule {}
