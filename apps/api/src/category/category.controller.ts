import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';

// 공개 엔드포인트(가드 없음). 상품 등록/검색 폼의 카테고리 셀렉트용.
@Controller('categories')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
