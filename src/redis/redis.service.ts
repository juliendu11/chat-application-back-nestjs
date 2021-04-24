import { Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import * as Redis from 'ioredis';
import { ConfigService, InjectConfig } from 'nestjs-config';

@Injectable()
export class RedisService {
  public redisPubSub: RedisPubSub;

  constructor(@InjectConfig() private readonly config: ConfigService) {
    const redisConfig = {
      host: config.get('redis.HOST'),
      port: Number(config.get('redis.PORT')),
      retryStrategy: (times) => {
        // reconnect after
        return Math.min(times * 50, 2000);
      },
    };

    this.redisPubSub = new RedisPubSub({
      publisher: new Redis(redisConfig),
      subscriber: new Redis(redisConfig),
    });
  }
}
