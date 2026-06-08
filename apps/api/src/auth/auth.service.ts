import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

interface AccessPayload {
  sub: string;
  role: string;
  jti: string;
}

interface RefreshPayload {
  sub: string;
  jti: string;
  typ: 'refresh';
}

const REFRESH_PREFIX = 'auth:refresh:';
const BLACKLIST_PREFIX = 'auth:bl:';

/**
 * 만료 표기(예 "1h", "7d") → 초.
 * NestJS JwtModule 의 `expiresIn` 과 동일 포맷을 받지만, Redis TTL 용 정수 변환이 필요.
 */
function parseDurationSeconds(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const m = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!m) return fallback;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 60 * 60;
    case 'd':
      return n * 60 * 60 * 24;
    default:
      return fallback;
  }
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.accessSecret = config.get<string>('JWT_ACCESS_SECRET') ?? '';
    this.refreshSecret = config.get<string>('JWT_REFRESH_SECRET') ?? '';
    this.accessExpiresIn = config.get<string>('JWT_ACCESS_EXPIRES') ?? '1h';
    this.refreshExpiresIn = config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d';
    this.accessTtlSec = parseDurationSeconds(this.accessExpiresIn, 3600);
    this.refreshTtlSec = parseDurationSeconds(
      this.refreshExpiresIn,
      60 * 60 * 24 * 7,
    );
  }

  async signup(dto: SignupDto) {
    const exists = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('이미 가입된 이메일입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const member = await this.prisma.member.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
      },
    });

    return { id: member.id.toString(), email: member.email };
  }

  async login(dto: LoginDto) {
    const member = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });
    if (!member)
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );

    const valid = await bcrypt.compare(dto.password, member.password);
    if (!valid)
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );

    const tokens = await this.issueTokens(member.id.toString(), member.role);

    return {
      ...tokens,
      member: {
        id: member.id.toString(),
        email: member.email,
        name: member.name,
        role: member.role,
      },
    };
  }

  /**
   * Refresh JWT 를 검증하고 Redis 화이트리스트에 살아있으면 새 access(+ 새 refresh) 발급.
   * 기존 refresh 는 회전(rotation)되어 즉시 무효화된다.
   */
  async refresh(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 refresh 토큰입니다.');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 refresh 토큰입니다.');
    }

    const key = REFRESH_PREFIX + payload.jti;
    const stored = await this.redis.get(key);
    if (!stored || stored !== payload.sub) {
      throw new UnauthorizedException(
        '만료되었거나 폐기된 refresh 토큰입니다.',
      );
    }

    // 회전: 기존 refresh 폐기 후 새로 발급
    await this.redis.del(key);

    const member = await this.prisma.member.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    if (!member) throw new UnauthorizedException('계정을 찾을 수 없습니다.');

    return this.issueTokens(member.id.toString(), member.role);
  }

  /**
   * 로그아웃: 제시된 access 의 jti 를 만료시각까지 블랙리스트에 등록 +
   * (옵션) refresh 토큰도 함께 폐기.
   */
  async logout(accessToken: string | undefined, refreshToken?: string) {
    if (accessToken) {
      try {
        const payload = await this.jwt.verifyAsync<AccessPayload>(accessToken, {
          secret: this.accessSecret,
        });
        const ttl = Math.max(
          1,
          this.accessTtlSec, // safety net
        );
        // exp 가 있으면 정확한 잔여시간으로 TTL 설정
        const exp = (payload as AccessPayload & { exp?: number }).exp;
        const nowSec = Math.floor(Date.now() / 1000);
        const remaining =
          typeof exp === 'number' ? Math.max(1, exp - nowSec) : ttl;
        await this.redis.setEx(
          BLACKLIST_PREFIX + payload.jti,
          payload.sub,
          remaining,
        );
      } catch {
        // 만료된/위조된 토큰은 그냥 무시(어차피 통과 못 함)
      }
    }

    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<RefreshPayload>(
          refreshToken,
          { secret: this.refreshSecret },
        );
        await this.redis.del(REFRESH_PREFIX + payload.jti);
      } catch {
        // 위조된 refresh 는 무시
      }
    }

    return { success: true };
  }

  /** access + refresh 한 쌍을 발급하고 refresh 만 Redis 화이트리스트에 저장한다. */
  private async issueTokens(memberId: string, role: string) {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = await this.jwt.signAsync(
      { sub: memberId, role, jti: accessJti } satisfies AccessPayload,
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: memberId,
        jti: refreshJti,
        typ: 'refresh',
      } satisfies RefreshPayload,
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    await this.redis.setEx(
      REFRESH_PREFIX + refreshJti,
      memberId,
      this.refreshTtlSec,
    );

    return { accessToken, refreshToken };
  }
}
