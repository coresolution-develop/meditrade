import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('size', new ParseIntPipe({ optional: true })) size = 20,
  ) {
    return this.productService.findAll(page, size);
  }

  // ⚠️ '/products/:id' 보다 먼저 선언되어야 'mine' 이 id 로 해석되지 않는다.
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  findMine(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('size', new ParseIntPipe({ optional: true })) size = 20,
  ) {
    return this.productService.findMine(BigInt(req.user.id), page, size);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(BigInt(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  create(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.productService.create(BigInt(req.user.id), dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(BigInt(req.user.id), BigInt(id), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(BigInt(req.user.id), BigInt(id));
  }
}
