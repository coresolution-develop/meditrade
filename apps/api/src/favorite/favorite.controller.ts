import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/favorite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUYER')
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateFavoriteDto) {
    return this.service.create(BigInt(req.user.id), BigInt(dto.productId));
  }

  @Delete(':productId')
  remove(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.service.remove(BigInt(req.user.id), BigInt(productId));
  }

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(BigInt(req.user.id));
  }
}
