import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import {
  CreateInquiryDto,
  CreateQuoteDto,
  FindInquiriesQueryDto,
} from './dto/inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('inquiries')
@UseGuards(JwtAuthGuard)
export class InquiryController {
  constructor(private readonly service: InquiryService) {}

  /** BUYER 만 발송. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('BUYER')
  create(@Req() req: any, @Body() dto: CreateInquiryDto) {
    return this.service.create(BigInt(req.user.id), dto);
  }

  /** ?role=buyer|seller 필수. */
  @Get()
  findMine(@Req() req: any, @Query() query: FindInquiriesQueryDto) {
    return this.service.findMine(BigInt(req.user.id), query.role);
  }

  /** 양측(소유자) 가능. */
  @Patch(':id/close')
  close(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.close(BigInt(req.user.id), BigInt(id));
  }

  /** SELLER 만, 본인이 받은 문의에 한해. */
  @Post(':id/quotes')
  @UseGuards(RolesGuard)
  @Roles('SELLER')
  createQuote(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.service.createQuote(BigInt(req.user.id), BigInt(id), dto);
  }
}
