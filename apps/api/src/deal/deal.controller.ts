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
import { DealService } from './deal.service';
import {
  CreateDealDto,
  FindDealsQueryDto,
  UpdateDealStatusDto,
} from './dto/deal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealController {
  constructor(private readonly service: DealService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('BUYER')
  create(@Req() req: any, @Body() dto: CreateDealDto) {
    return this.service.create(BigInt(req.user.id), dto);
  }

  @Get()
  findMine(@Req() req: any, @Query() query: FindDealsQueryDto) {
    return this.service.findMine(BigInt(req.user.id), query.role);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDealStatusDto,
  ) {
    return this.service.updateStatus(BigInt(req.user.id), BigInt(id), dto);
  }
}
