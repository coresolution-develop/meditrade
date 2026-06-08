import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController, SellerReviewController } from './review.controller';

@Module({
  controllers: [ReviewController, SellerReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
