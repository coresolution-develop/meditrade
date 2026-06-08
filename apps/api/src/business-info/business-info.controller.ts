import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';
import { CreateBusinessInfoDto } from './dto/business-info.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('business-info')
export class BusinessInfoController {
  constructor(private readonly service: BusinessInfoService) {}

  /** SELLER 만 등록 가능. 미인증 401, 비SELLER 403. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  create(@Req() req: any, @Body() dto: CreateBusinessInfoDto) {
    return this.service.create(BigInt(req.user.id), dto);
  }

  /** 본인 인증 상태 조회. 인증만 필요(SELLER 가입 정책 변경에도 호환). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: any) {
    return this.service.findMine(BigInt(req.user.id));
  }
}
