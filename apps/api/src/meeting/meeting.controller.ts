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
import { MeetingService } from './meeting.service';
import {
  CreateMeetingDto,
  FindMeetingsQueryDto,
  UpdateMeetingDto,
} from './dto/meeting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingController {
  constructor(private readonly service: MeetingService) {}

  /** BUYER 만 새 미팅 요청 발송. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('BUYER')
  create(@Req() req: any, @Body() dto: CreateMeetingDto) {
    return this.service.create(BigInt(req.user.id), dto);
  }

  /** ?role=buyer|seller 필수. */
  @Get()
  findMine(@Req() req: any, @Query() query: FindMeetingsQueryDto) {
    return this.service.findMine(BigInt(req.user.id), query.role);
  }

  /**
   * 상태 변경. 행위자(buyer/seller)는 미팅 소속에서 도출하여 검증.
   * 역할별 허용 전이는 상태머신(meeting.service.ts) 에서 강제.
   */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.service.update(BigInt(req.user.id), BigInt(id), dto);
  }
}
