import { Controller, Get, Module } from '@nestjs/common';

const notifications = [
  { id: 'n1', text: 'Price drop on rice bundles', unread: true },
  { id: 'n2', text: 'Your shop received 4 new reviews', unread: false }
];

class NotificationsService {
  findAll() {
    return notifications;
  }
}

@Controller('notifications')
class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll() {
    return this.notificationsService.findAll();
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService]
})
export class NotificationsModule {}
