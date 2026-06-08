import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  /** BUYER 만 작성 가능 (COMPLETED 거래에 한해, 거래당 1회). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER')
  create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return this.service.create(BigInt(req.user.id), dto);
  }
}

@Controller('sellers')
export class SellerReviewController {
  constructor(private readonly service: ReviewService) {}

  /** 판매자별 리뷰 목록 + 평균 평점. 공개. */
  @Get(':id/reviews')
  findForSeller(@Param('id', ParseIntPipe) id: number) {
    return this.service.findForSeller(BigInt(id));
  }
}
