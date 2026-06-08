import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

/**
 * NotificationService 를 전역 export 한다.
 * 다른 도메인 모듈(inquiry, deal, meeting)이 별도 import 없이 주입받아 사용한다.
 */
@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
