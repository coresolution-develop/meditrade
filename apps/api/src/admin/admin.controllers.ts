import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { BusinessInfoAdminService } from './business-info-admin.service';
import { ProductAdminService } from './product-admin.service';
import { CategoryAdminService } from './category-admin.service';
import { ManufacturerAdminService } from './manufacturer-admin.service';
import { MemberAdminService } from './member-admin.service';
import {
  CreateCategoryDto,
  CreateManufacturerDto,
  UpdateBusinessInfoVerifyDto,
  UpdateCategoryDto,
  UpdateManufacturerDto,
  UpdateMemberStatusDto,
  UpdateProductStatusDto,
} from './dto/admin.dto';

// ─── business-info ─────────────────────────────────────
@Controller('admin/business-info')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BusinessInfoAdminController {
  constructor(private readonly service: BusinessInfoAdminService) {}

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessInfoVerifyDto,
  ) {
    return this.service.updateVerify(BigInt(id), dto);
  }
}

// ─── product ───────────────────────────────────────────
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ProductAdminController {
  constructor(private readonly service: ProductAdminService) {}

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.service.updateStatus(BigInt(id), dto);
  }
}

// ─── category ──────────────────────────────────────────
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CategoryAdminController {
  constructor(private readonly service: CategoryAdminService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }
}

// ─── manufacturer ──────────────────────────────────────
@Controller('admin/manufacturers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ManufacturerAdminController {
  constructor(private readonly service: ManufacturerAdminService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateManufacturerDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManufacturerDto,
  ) {
    return this.service.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }
}

// ─── member ────────────────────────────────────────────
@Controller('admin/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MemberAdminController {
  constructor(private readonly service: MemberAdminService) {}

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.service.updateStatus(BigInt(id), dto);
  }
}
