import { Controller, Get, Module, Query } from '@nestjs/common';

class SearchService {
  search(keyword?: string) {
    const q = (keyword ?? '').trim().toLowerCase();

    const items = [
      { type: 'product', name: 'Fresh Mangoes', match: 98 },
      { type: 'shop', name: 'Nairobi Fresh Market', match: 92 },
      { type: 'seller', name: 'Patricia Wanjiku', match: 89 }
    ];

    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }
}

@Controller('search')
class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q?: string) {
    return this.searchService.search(q);
  }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService]
})
export class SearchModule {}
