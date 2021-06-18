import { Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import * as Redis from 'ioredis';
import { ConfigService, InjectConfig } from 'nestjs-config';
import { Redis as RedisType } from 'ioredis';

import { Room } from '../rooms/entities/room.entity';
import { Message } from '../rooms/entities/sub/message.entity';
import { RoomAddedPublish } from './publish-dto/room-added.publish';
import { RoomMessageAddedPublish } from './publish-dto/room-message-added.publish';
import {
  CONVERSATION_NEW_MESSAGE,
  CONVERSATION_ADDED,
  MEMBER_OFFLINE,
  MEMBER_ONLINE,
  ROOM_ADDED,
  ROOM_MESSAGE_ADDED,
} from './redis.pub-sub';
import { JWTTokenData } from '../types/JWTToken';
import { ConversationNewMessagePublish } from './publish-dto/conversation-new-message.publish';
import { ConversationNewMessageOutput } from '../conversations/dto/output/conversation-new-message.output';
import { MemberOnlineOutputUser } from 'src/members/dto/ouput/member-online.ouput';
import { MemberOnlinePublish } from './publish-dto/member-online.publish';
import { MemberOfflinePublish } from './publish-dto/member-offline.publish';
import { RedisSessionData } from 'src/types/RedisSessionData';
import { ServiceResponseType } from 'src/interfaces/GraphqlResponse';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { ConversationAddedPublish } from './publish-dto/conversation-added.publish';
import { ConversationsOutputValue } from 'src/conversations/dto/output/conversations.output';

const ONLINE_KEY = 'ONLINE';
const SESSION_KEY = 'SESSION';

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

    const dateReviver = (key, value) => {
      const isISO8601Z = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
      if (typeof value === 'string' && isISO8601Z.test(value)) {
        const tempDateNumber = Date.parse(value);
        if (!isNaN(tempDateNumber)) {
          return new Date(tempDateNumber);
        }
      }
      return value;
    };

    this.redisPubSub = new RedisPubSub({
      publisher: new Redis(redisConfig),
      subscriber: new Redis(redisConfig),
      reviver: dateReviver,
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

  private getSessionKeyName(username: string) {
    return `${SESSION_KEY}:${username}`;
  }

  async getUserSession(
    username: string,
  ): Promise<ServiceResponseType<RedisSessionData | null>> {
    try {
      console.log(this.getSessionKeyName(username));
      const session = await this.redis.get(this.getSessionKeyName(username));
      if (!session) {
        return {
          code: 404,
          message: 'No session exist',
          value: null,
        };
      }

      const parsed: RedisSessionData = JSON.parse(session);

      return {
        code: 200,
        message: '',
        value: parsed,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  setUserSession(username: string, session: RedisSessionData) {
    this.redis.set(this.getSessionKeyName(username), JSON.stringify(session));
  }

  async updateTokenInUserSession(username: string, newToken: string) {
    const value = await this.redis.get(this.getSessionKeyName(username));
    const session: RedisSessionData = JSON.parse(value);

    session.jwtToken = newToken;

    this.setUserSession(username, session);
  }

  removeUserSession(username: string) {
    this.redis.del(this.getSessionKeyName(username));
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

  conversationAddedListener() {
    return this.redisPubSub.asyncIterator(CONVERSATION_ADDED);
  }

  conversationAddedPublish(conversation: ConversationsOutputValue) {
    this.redisPubSub.publish(CONVERSATION_ADDED, {
      conversationAdded: conversation,
    } as ConversationAddedPublish);
  }

  conversationNewMessageListener() {
    return this.redisPubSub.asyncIterator(CONVERSATION_NEW_MESSAGE);
  }

  conversationNewMessagePublish(
    conversationNewMessageOutput: ConversationNewMessageOutput,
  ) {
    this.redisPubSub.publish(CONVERSATION_NEW_MESSAGE, {
      conversationNewMessage: {
        ...conversationNewMessageOutput,
        last_message: {
          ...conversationNewMessageOutput.last_message,
          date: new Date(conversationNewMessageOutput.last_message.date),
        },
      },
    } as ConversationNewMessagePublish);
  }

  memberOnlineListener() {
    return this.redisPubSub.asyncIterator(MEMBER_ONLINE);
  }

  memberOnlinePublish(memberOnline: MemberOnlineOutputUser) {
    this.redisPubSub.publish(MEMBER_ONLINE, {
      memberOnline,
    } as MemberOnlinePublish);
  }

  memberOfflineListener() {
    return this.redisPubSub.asyncIterator(MEMBER_OFFLINE);
  }

  memberOfflinePublish(memberOffline: MemberOnlineOutputUser) {
    this.redisPubSub.publish(MEMBER_OFFLINE, {
      memberOffline,
    } as MemberOfflinePublish);
  }
}
