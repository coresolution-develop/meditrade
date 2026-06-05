import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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

    const payload = {
      sub: member.id.toString(),
      role: member.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      member: {
        id: member.id.toString(),
        email: member.email,
        name: member.name,
        role: member.role,
      },
    };
  }
}
