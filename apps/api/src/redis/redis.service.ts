import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url =
      this.config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
    this.client = new Redis(url, { lazyConnect: false });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /** 세션/토큰 저장용 단일 클라이언트. 다른 모듈에서 직접 호출. */
  get redis(): Redis {
    return this.client;
  }

  /** SET key value EX <ttlSeconds> — 편의 메서드 */
  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }
}
