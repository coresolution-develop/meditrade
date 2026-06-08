import { Module } from '@nestjs/common';
import {
  BusinessInfoAdminController,
  CategoryAdminController,
  ManufacturerAdminController,
  MemberAdminController,
  ProductAdminController,
} from './admin.controllers';
import { BusinessInfoAdminService } from './business-info-admin.service';
import { CategoryAdminService } from './category-admin.service';
import { ManufacturerAdminService } from './manufacturer-admin.service';
import { MemberAdminService } from './member-admin.service';
import { ProductAdminService } from './product-admin.service';

@Module({
  controllers: [
    BusinessInfoAdminController,
    ProductAdminController,
    CategoryAdminController,
    ManufacturerAdminController,
    MemberAdminController,
  ],
  providers: [
    BusinessInfoAdminService,
    ProductAdminService,
    CategoryAdminService,
    ManufacturerAdminService,
    MemberAdminService,
  ],
})
export class AdminModule {}
