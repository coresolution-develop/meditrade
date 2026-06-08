import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { BusinessInfoModule } from './business-info/business-info.module';
import { FavoriteModule } from './favorite/favorite.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { MeetingModule } from './meeting/meeting.module';
import { DealModule } from './deal/deal.module';
import { ReviewModule } from './review/review.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    ProductModule,
    BusinessInfoModule,
    FavoriteModule,
    InquiryModule,
    MeetingModule,
    DealModule,
    ReviewModule,
    NotificationModule,
    AdminModule,
  ],
})
export class AppModule {}
