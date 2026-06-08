import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';

export interface JwtPayload {
  sub: string;
  role: string;
  jti?: string;
}

const BLACKLIST_PREFIX = 'auth:bl:';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    // 블랙리스트(로그아웃된 토큰) 차단
    if (payload.jti) {
      const blacklisted = await this.redis.exists(
        BLACKLIST_PREFIX + payload.jti,
      );
      if (blacklisted) {
        throw new UnauthorizedException('만료된 토큰입니다.');
      }
    }
    return { id: payload.sub, role: payload.role };
  }
}
