import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { HealthController } from './health/health.controller';
import { MapsModule } from './maps/maps.module';
import { MpesaService } from './payments/mpesa.service';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { SellersModule } from './sellers/sellers.module';
import { ShopsModule } from './shops/shops.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ProductsModule,
    ShopsModule,
    SellersModule,
    CategoriesModule,
    SearchModule,
    SubscriptionsModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    VideosModule,
    MapsModule,
    PaymentsModule
  ],
  controllers: [HealthController],
  providers: [MpesaService],
  exports: [MpesaService]
})
export class AppModule {}
