# MVP Phase 1 — 백엔드(NestJS) 세팅 가이드

> 스택: **Next.js(웹) + NestJS(백엔드) + PostgreSQL + Prisma + JWT**
> 이 문서 범위: **인증(회원가입·로그인·JWT) + 상품 CRUD** 골격까지

---

## 0. 결론

모노레포 `apps/api`에 NestJS 백엔드를 세운다.
공통 응답 포맷(`ApiResponse`) + 전역 예외 필터를 먼저 깔고, `auth`(JWT)·`product`(CRUD) 모듈을 올린다.
DB는 Prisma로 접근하며, JWT는 무상태(stateless)라 추후 서버 수평 확장에 그대로 대응된다.

---

## 1. 모노레포 구조

```
medi-trade/
├─ apps/
│  ├─ api/            # NestJS 백엔드 (이번 문서)
│  ├─ web/            # Next.js 웹 (다음 단계)
│  └─ mobile/         # React Native (추후)
├─ packages/
│  └─ shared/         # 웹·앱·API 공용 타입(DTO 등)
└─ package.json
```

> 이번엔 `apps/api`만 진행. 모노레포 도구(Turborepo/pnpm workspace)는 web 합칠 때 도입해도 됨.

---

## 2. 프로젝트 초기화 (명령어)

```bash
# Node 20+ 권장
npm i -g @nestjs/cli

# api 앱 생성
nest new apps/api --package-manager npm
cd apps/api

# 의존성
npm i @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
npm i class-validator class-transformer bcrypt
npm i @prisma/client
npm i -D prisma @types/passport-jwt @types/bcrypt

# prisma 초기화
npx prisma init --datasource-provider postgresql
```

---

## 3. 환경변수 — `apps/api/.env`

> ⚠️ 실제 시크릿은 커밋 금지. `.env`는 `.gitignore`에 추가하고, 예시는 `.env.example`로 둔다.

```dotenv
# apps/api/.env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/meditrade?schema=public"
JWT_ACCESS_SECRET="여기에-충분히-긴-랜덤-문자열"
JWT_ACCESS_EXPIRES="1h"
TZ="Asia/Seoul"
```

---

## 4. Prisma 스키마 — `apps/api/prisma/schema.prisma`

> Phase 1 최소 테이블: Member / Category / Product / ProductImage

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  BUYER
  SELLER
  ADMIN
}

enum MemberStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

enum ConditionType {
  NEW
  USED
  REFURBISHED
}

enum ProductStatus {
  DRAFT
  PENDING
  ON_SALE
  SOLD_OUT
  HIDDEN
}

model Member {
  id        BigInt       @id @default(autoincrement())
  email     String       @unique @db.VarChar(100)
  password  String       @db.VarChar(255)
  name      String       @db.VarChar(50)
  phone     String?      @db.VarChar(20)
  role      Role         @default(BUYER)
  status    MemberStatus @default(ACTIVE)
  createdAt DateTime     @default(now()) @map("created_at")

  products  Product[]

  @@map("member")
}

model Category {
  id        BigInt     @id @default(autoincrement())
  parentId  BigInt?    @map("parent_id")
  name      String     @db.VarChar(50)
  sortOrder Int        @default(0) @map("sort_order")

  products  Product[]

  @@map("category")
}

model Product {
  id              BigInt        @id @default(autoincrement())
  sellerId        BigInt        @map("seller_id")
  categoryId      BigInt        @map("category_id")
  name            String        @db.VarChar(200)
  modelName       String?       @map("model_name") @db.VarChar(100)
  conditionType   ConditionType @default(USED) @map("condition_type")
  price           BigInt?
  priceNegotiable Boolean       @default(false) @map("price_negotiable")
  stock           Int           @default(1)
  region          String?       @db.VarChar(50)
  description     String?
  status          ProductStatus @default(DRAFT)
  viewCount       Int           @default(0) @map("view_count")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  seller   Member         @relation(fields: [sellerId], references: [id])
  category Category       @relation(fields: [categoryId], references: [id])
  images   ProductImage[]

  @@index([categoryId])
  @@index([sellerId])
  @@map("product")
}

model ProductImage {
  id        BigInt  @id @default(autoincrement())
  productId BigInt  @map("product_id")
  imageUrl  String  @map("image_url") @db.VarChar(500)
  isMain    Boolean @default(false) @map("is_main")
  sortOrder Int     @default(0) @map("sort_order")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_image")
}
```

마이그레이션:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 5. Prisma 모듈 — `apps/api/src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`apps/api/src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## 6. 공통 응답 포맷 + 전역 예외 필터

### 6.1 응답 타입 — `apps/api/src/common/api-response.ts`

```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
}

export function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return { success: true, code: 'OK', message, data };
}

export function fail(code: string, message: string): ApiResponse<null> {
  return { success: false, code, message, data: null };
}
```

### 6.2 성공 응답 래핑 인터셉터 — `apps/api/src/common/response.interceptor.ts`

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, ok } from './api-response';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // 이미 ApiResponse 형태면 그대로, 아니면 ok()로 래핑
    return next.handle().pipe(
      map((data: any) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data as ApiResponse<T>;
        }
        return ok(data as T);
      }),
    );
  }
}
```

### 6.3 전역 예외 필터 — `apps/api/src/common/all-exceptions.filter.ts`

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { fail } from './api-response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '서버 오류가 발생했습니다.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse() as any;

      // class-validator 검증 에러
      if (status === HttpStatus.BAD_REQUEST && resBody?.message) {
        code = 'VALIDATION_ERROR';
        message = Array.isArray(resBody.message)
          ? resBody.message.join(', ')
          : String(resBody.message);
      } else {
        code = this.mapStatusToCode(status);
        message = resBody?.message ?? exception.message;
      }
    }

    // 사용자 메시지와 로그 메시지 분리: 500은 stacktrace 포함
    if (status >= 500) {
      this.logger.error(
        `[${req.method}] ${req.url} - ${code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${req.method}] ${req.url} - ${code}: ${message}`);
    }

    res.status(status).json(fail(code, message));
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      default:
        return 'ERROR';
    }
  }
}
```

---

## 7. main.ts — 전역 설정 — `apps/api/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  process.env.TZ = 'Asia/Seoul';

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors(); // 웹/앱 클라이언트 분리 → CORS 필요(운영 시 origin 제한)

  await app.listen(3001);
}
bootstrap();
```

---

## 8. Auth 모듈 (회원가입 · 로그인 · JWT)

### 8.1 DTO — `apps/api/src/auth/dto/auth.dto.ts`

```typescript
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Role)
  role!: Role; // BUYER | SELLER
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
```

### 8.2 Service — `apps/api/src/auth/auth.service.ts`

```typescript
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
    // 계정 존재 여부를 노출하지 않도록 메시지 통일
    if (!member) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const valid = await bcrypt.compare(dto.password, member.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

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
```

### 8.3 JWT 전략 / 가드 — `apps/api/src/auth/jwt.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  validate(payload: JwtPayload) {
    // req.user 에 담김
    return { id: payload.sub, role: payload.role };
  }
}
```

`apps/api/src/auth/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### 8.4 역할 가드 — `apps/api/src/auth/roles.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return true;
  }
}
```

### 8.5 Controller — `apps/api/src/auth/auth.controller.ts`

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

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
}
```

### 8.6 Module — `apps/api/src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES') ?? '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

---

## 9. Product 모듈 (CRUD)

### 9.1 DTO — `apps/api/src/product/dto/product.dto.ts`

```typescript
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ConditionType, ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsInt()
  categoryId!: number;

  @IsEnum(ConditionType)
  conditionType!: ConditionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() modelName?: string;
  @IsOptional() @IsInt() price?: number;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
```

### 9.2 Service — `apps/api/src/product/product.service.ts`

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

// BigInt → string 직렬화(JSON에서 BigInt 미지원)
function serialize(p: any) {
  return {
    ...p,
    id: p.id.toString(),
    sellerId: p.sellerId.toString(),
    categoryId: p.categoryId.toString(),
    price: p.price === null ? null : Number(p.price),
  };
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, size = 20) {
    const skip = (page - 1) * size;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ON_SALE' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.product.count({ where: { status: 'ON_SALE' } }),
    ]);
    return { items: items.map(serialize), total, page, size };
  }

  async findOne(id: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, category: true },
    });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    return serialize(product);
  }

  async create(sellerId: bigint, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        sellerId,
        categoryId: BigInt(dto.categoryId),
        name: dto.name,
        modelName: dto.modelName,
        conditionType: dto.conditionType,
        price: dto.price != null ? BigInt(dto.price) : null,
        region: dto.region,
        description: dto.description,
        status: 'ON_SALE',
      },
    });
    return serialize(product);
  }

  async update(sellerId: bigint, id: bigint, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('본인 상품만 수정할 수 있습니다.');

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        price: dto.price != null ? BigInt(dto.price) : undefined,
      },
    });
    return serialize(updated);
  }

  async remove(sellerId: bigint, id: bigint) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('본인 상품만 삭제할 수 있습니다.');

    await this.prisma.product.delete({ where: { id } });
    return { id: id.toString() };
  }
}
```

### 9.3 Controller — `apps/api/src/product/product.controller.ts`

```typescript
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
```

### 9.4 Module — `apps/api/src/product/product.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
```

---

## 10. 루트 모듈 — `apps/api/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProductModule,
  ],
})
export class AppModule {}
```

---

## 11. 실행 & 검증 체크리스트

```bash
npm run start:dev   # http://localhost:3001/api/v1
```

- [ ] **회원가입**: `POST /api/v1/auth/signup` (email/password/name/role=SELLER) → `success:true`
- [ ] **로그인**: `POST /api/v1/auth/login` → `data.accessToken` 수신
- [ ] **상품 등록(권한)**: 토큰 없이 `POST /api/v1/products` → 401 / `UNAUTHORIZED`
- [ ] **상품 등록**: `Authorization: Bearer <token>` + SELLER → 201 / 생성됨
- [ ] **목록**: `GET /api/v1/products` → ON_SALE만 페이징 조회
- [ ] **검증 실패**: 잘못된 바디 → 400 / `VALIDATION_ERROR`
- [ ] **권한 위반**: 남의 상품 수정 → 403 / `FORBIDDEN`
- [ ] 응답이 모두 `{ success, code, message, data }` 형태인지

---

## 12. 다음 단계

1. **Next.js 웹 골격** (`apps/web`) — 로그인/상품목록/상품등록 화면 + API 연동
2. 이미지 업로드(Object Storage) 연동
3. Redis + refresh 토큰 도입(무상태 확장 본격화)
4. business_info(사업자 인증) → inquiry/quote/deal 모듈 확장
