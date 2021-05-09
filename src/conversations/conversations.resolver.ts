import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Subscription, Query } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { getResult } from '../helpers/code.helper';
import { Member } from '../members/entities/member.entity';
import { CONVERSATION_NEW_MESSAGE } from '../redis/redis.pub-sub';
import { RedisService } from '../redis/redis.service';
import { JWTTokenData } from '../types/JWTToken';
import { ConversationsService } from './conversations.service';
import { GetConversationMessageInput } from './dto/input/conversation-messages.input';
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
  ) {}

  @Query(() => [ConversationsOutput], { name: 'conversations' })
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
      value: value as ConversationsOutputValue[],
    };
  }

  @Query(() => GetConversationMessageOutput)
  @UseGuards(GqlAuthGuard)
  async conversationMessages(
    @Args('getConversationMessageInput')
    getConversationMessageInput: GetConversationMessageInput,
  ): Promise<GetConversationMessageOutput> {
    const {
      code,
      message,
      value,
    } = await this.conversationsService.conversationMessages(
      getConversationMessageInput.id,
      getConversationMessageInput.skip,
      getConversationMessageInput.limit,
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
    const {
      code,
      message,
      value,
    } = await this.conversationsService.addOrCreate(
      user._id,
      conversationSendMessageInput,
    );

    const result = getResult(code);
    if (result) {
      this.redisService.conversationNewMessagePublish({
        last_message: value.last_message,
        _id: value._id,
        members: value.members as Member[],
      });
    }

    return {
      result,
      message,
    };
  }

  @Subscription(() => ConversationNewMessageOutput, {
    name: CONVERSATION_NEW_MESSAGE,
  })
  conversationNewMessageHandler() {
    return this.redisService.conversationNewMessageListener();
  }
}
