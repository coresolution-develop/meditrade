import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, SignupDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * 인증 필요. 헤더의 access 토큰을 블랙리스트로 등록(만료시각까지).
   * body 에 refreshToken 이 함께 오면 해당 refresh 도 폐기.
   */
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(
    @Headers('authorization') auth: string | undefined,
    @Body() body: Partial<RefreshDto> | undefined,
  ) {
    const accessToken = auth?.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : undefined;
    return this.authService.logout(accessToken, body?.refreshToken);
  }
}
