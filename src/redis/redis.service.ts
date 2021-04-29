import { Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import * as Redis from 'ioredis';
import { ConfigService, InjectConfig } from 'nestjs-config';
import { Redis as RedisType } from 'ioredis';

import { Room } from '../rooms/entities/room.entity';
import { Message } from '../rooms/entities/sub/message.entity';
import { RoomAddedPublish } from './publish-dto/room-added.publish';
import { RoomMessageAddedPublish } from './publish-dto/room-message-added.publish';
import { ROOM_ADDED, ROOM_MESSAGE_ADDED } from './redis.pub-sub';
import { JWTTokenData } from '../types/JWTToken';

const ONLINE_KEY = 'ONLINE';

@Injectable()
export class RedisService {
  private redis: RedisType;
  private redisPubSub: RedisPubSub;

  constructor(@InjectConfig() private readonly config: ConfigService) {
    const redisConfig = {
      host: config.get('redis.HOST'),
      port: Number(config.get('redis.PORT')),
      retryStrategy: (times) => {
        // reconnect after
        return Math.min(times * 50, 2000);
      },
    };
    this.redis = new Redis(redisConfig);

    this.redisPubSub = new RedisPubSub({
      publisher: new Redis(redisConfig),
      subscriber: new Redis(redisConfig),
    });
  }

  private getOnlineKeyName(username: string) {
    return `${ONLINE_KEY}:${username}`;
  }

  setUserConnected(username: string, userInfo: JWTTokenData) {
    this.redis.set(this.getOnlineKeyName(username), JSON.stringify(userInfo));
  }

  removeUserConnected(username: string) {
    this.redis.del(this.getOnlineKeyName(username));
  }

  async getUsersConncted(): Promise<JWTTokenData[]> {
    const users: JWTTokenData[] = [];

    const keys = await this.redis.keys(ONLINE_KEY + ':*');
    await Promise.all(
      keys.map(async (key) => {
        const user = await this.redis.get(key);
        users.push(JSON.parse(user));
      }),
    );

    return users;
  }

  roomAddedListener() {
    return this.redisPubSub.asyncIterator(ROOM_ADDED);
  }

  roomAddedPublish(room: Room) {
    this.redisPubSub.publish(ROOM_ADDED, {
      roomAdded: room,
    } as RoomAddedPublish);
  }

  roomMessageAddedListener() {
    return this.redisPubSub.asyncIterator(ROOM_MESSAGE_ADDED);
  }

  roomMessageAddedPublish(message: Message, id: string) {
    this.redisPubSub.publish(ROOM_MESSAGE_ADDED, {
      roomMessageAdded: {
        message,
        id,
      },
    } as RoomMessageAddedPublish);
  }
}
