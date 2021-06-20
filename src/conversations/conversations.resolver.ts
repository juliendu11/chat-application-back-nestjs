import { UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resolver, Mutation, Args, Subscription, Query } from '@nestjs/graphql';
import { MessageMedia } from 'src/rooms/entities/sub/message.entity';
import { UploadingService } from 'src/uploading/uploading.service';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { getResult } from '../helpers/code.helper';
import { Member } from '../members/entities/member.entity';
import {
  CONVERSATION_ADDED,
  CONVERSATION_NEW_MESSAGE,
} from '../redis/redis.pub-sub';
import { RedisService } from '../redis/redis.service';
import { JWTTokenData } from '../types/JWTToken';
import { ConversationsService } from './conversations.service';
import { ConversationMessageInput } from './dto/input/conversation-messages.input';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import { GetConversationMessageOutput } from './dto/output/conversation-messages.output';
import { ConversationNewMessageOutput } from './dto/output/conversation-new-message.output';
import { ConversationSendMessageOutput } from './dto/output/conversation-send-message.output';
import {
  ConversationsOutput,
  ConversationsOutputValue,
} from './dto/output/conversations.output';

@Resolver()
export class ConversationsResolver {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly redisService: RedisService,
    private readonly uploadingService: UploadingService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Query(() => ConversationsOutput, { name: 'conversations' })
  @UseGuards(GqlAuthGuard)
  async findAll(
    @CurrentUser() user: JWTTokenData,
  ): Promise<ConversationsOutput> {
    const {
      code,
      message,
      value,
    } = await this.conversationsService.findAllWithPopulate(user._id, true);

    return {
      result: getResult(code),
      message,
      value: value,
    };
  }

  @Query(() => GetConversationMessageOutput)
  @UseGuards(GqlAuthGuard)
  async conversationMessages(
    @Args('conversationMessageInput')
    conversationMessageInput: ConversationMessageInput,
  ): Promise<GetConversationMessageOutput> {
    const {
      code,
      message,
      value,
    } = await this.conversationsService.conversationMessages(
      conversationMessageInput.id,
      conversationMessageInput.skip,
      conversationMessageInput.limit,
    );

    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => ConversationSendMessageOutput)
  @UseGuards(GqlAuthGuard)
  async conversationSendMessage(
    @Args('conversationSendMessageInput')
    conversationSendMessageInput: ConversationSendMessageInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<ConversationSendMessageOutput> {
    const getConversation = await this.conversationsService.get(
      user._id,
      conversationSendMessageInput.memberId,
    );

    if (!getResult(getConversation.code)) {
      return {
        result: false,
        message: getConversation.message,
      };
    }

    if (!getConversation.value) {
      const createConversation = await this.conversationsService.create(
        user._id,
        conversationSendMessageInput.memberId,
      );
      if (!getResult(createConversation.code) || !createConversation.value) {
        return {
          result: false,
          message: createConversation.message,
        };
      }

      this.redisService.conversationAddedPublish(createConversation.value);
    }

    const mediasPath: MessageMedia[] = [];

    if (conversationSendMessageInput.medias.length !== 0) {
      await Promise.all(
        conversationSendMessageInput.medias.map(async (media) => {
          const uploadMedia = await this.uploadingService.uploadConversationMedia(
            getConversation.value._id.toString(),
            media,
          );
          if (!getResult(uploadMedia.code) || !uploadMedia.value) {
            throw new Error(uploadMedia.message);
          }
          mediasPath.push(uploadMedia.value);
        }),
      );
    }

    const addNewMessage = await this.conversationsService.addMessage(
      user._id,
      conversationSendMessageInput,
      mediasPath,
    );

    const result = getResult(addNewMessage.code);
    if (result) {
      this.redisService.conversationNewMessagePublish({
        last_message: addNewMessage.value.last_message,
        _id: addNewMessage.value._id,
        members: addNewMessage.value.members as Member[],
      });

      this.eventEmitter.emit(
        'added.pm',
        conversationSendMessageInput.memberId,
        'AAAA',
      );
    }

    return {
      result,
      message: addNewMessage.message,
    };
  }

  @Subscription(() => ConversationsOutputValue, {
    name: CONVERSATION_ADDED,
    filter: (payload, _, context) => {
      return payload.conversationAdded.members.some(
        (x) => x._id.toString() === context.user._id.toString(),
      );
    },
  })
  roomAddedHandler() {
    return this.redisService.conversationAddedListener();
  }

  @Subscription(() => ConversationNewMessageOutput, {
    name: CONVERSATION_NEW_MESSAGE,
    filter: (payload, _, context) => {
      return payload.conversationNewMessage.members.some(
        (x) => x._id.toString() === context.user._id.toString(),
      );
    },
  })
  conversationNewMessageHandler() {
    return this.redisService.conversationNewMessageListener();
  }
}
