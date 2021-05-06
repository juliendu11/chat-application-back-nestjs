import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Subscription, Query } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { getResult } from '../helpers/code.helper';
import { Member } from '../members/entities/member.entity';
import { ForgotPassword } from '../members/entities/sub/forgot-password.entity';
import { MembersService } from '../members/members.service';
import { CONVERSATION_NEW_MESSAGE } from '../redis/redis.pub-sub';
import { RedisService } from '../redis/redis.service';
import { JWTTokenData } from '../types/JWTToken';
import { ConversationsService } from './conversations.service';
import { GetConversationMessageInput } from './dto/input/conversation-messages.input';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import { GetConversationMessageOutput } from './dto/output/conversation-messages.output';
import { ConversationNewMessageOutput } from './dto/output/conversation-new-message.output';
import { ConversationSendMessageOutput } from './dto/output/conversation-send-message.output';
import { ConversationsOutput } from './dto/output/conversations.output';

@Resolver()
export class ConversationsResolver {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly redisService: RedisService,
    private readonly memberService: MembersService,
  ) {
    // setInterval(() => {
    //   this.test();
    // }, 200);
  }

  test() {
    this.redisService.conversationNewMessagePublish({
      last_message: {
        user: {
          _id: Types.ObjectId(),
          username: 'Bob',
          email: 'bob@bobo.com',
          password: '123',
          registration_information: {
            token: 'b',
            date: new Date(),
            expiration_date: new Date(),
          },
          forgot_password: new ForgotPassword(),
          confirmed: true,
          rooms: [],
          profilPic: '',
          isOnline: true,
          conversations: [],
        },
        date: new Date(),
        message: 'test',
      },
      _id: Types.ObjectId(),
      members: [
        {
          _id: Types.ObjectId(),
          username: 'Bob',
          email: 'bob@bobo.com',
          password: '123',
          registration_information: {
            token: 'b',
            date: new Date(),
            expiration_date: new Date(),
          },
          forgot_password: new ForgotPassword(),
          confirmed: true,
          rooms: [],
          profilPic: '',
          isOnline: true,
          conversations: [],
        },
      ],
    });
  }

  @Query(() => [ConversationsOutput], { name: 'conversations' })
  @UseGuards(GqlAuthGuard)
  async findAll(@CurrentUser() user: JWTTokenData): Promise<ConversationsOutput[]> {
    return (await this.conversationsService.findAllWithPopulate(user._id, true)) as ConversationsOutput[];
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

    await Promise.all(
      value.messages.map(async (message) => {
        message.user = (await this.memberService.findOne(
          message.user.toString(),
          ['_id', 'username', 'email', 'profilPic'],
          true,
        )) as Member;
      }),
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
      const conversation = await this.conversationsService.findOneByIdWithPopulate(
        value._id.toString(),
        true,
      );

      this.redisService.conversationNewMessagePublish({
        last_message: conversation.last_message,
        _id: conversation._id,
        members: conversation.members as Member[],
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
