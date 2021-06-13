import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Subscription, Query } from '@nestjs/graphql';
import { MessageMedia } from 'src/rooms/entities/sub/message.entity';
import { UploadingService } from 'src/uploading/uploading.service';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { getResult } from '../helpers/code.helper';
import { Member } from '../members/entities/member.entity';
import { CONVERSATION_NEW_MESSAGE } from '../redis/redis.pub-sub';
import { RedisService } from '../redis/redis.service';
import { JWTTokenData } from '../types/JWTToken';
import { ConversationsService } from './conversations.service';
import { ConversationMessageInput } from './dto/input/conversation-messages.input';
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
    private readonly uploadingService: UploadingService,
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
    const getConversation = await this.conversationsService.getOrCreate(
      user._id,
      conversationSendMessageInput.memberId,
    );
    if (!getResult(getConversation.code)) {
      return {
        result: getResult(getConversation.code),
        message: getConversation.message,
      };
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

    const addNewImage = await this.conversationsService.addOrCreate(
      user._id,
      conversationSendMessageInput,
      mediasPath,
    );

    const result = getResult(addNewImage.code);
    if (result) {
      this.redisService.conversationNewMessagePublish({
        last_message: addNewImage.value.last_message,
        _id: addNewImage.value._id,
        members: addNewImage.value.members as Member[],
      });
    }

    return {
      result,
      message: addNewImage.message,
    };
  }

  @Subscription(() => ConversationNewMessageOutput, {
    name: CONVERSATION_NEW_MESSAGE,
  })
  conversationNewMessageHandler() {
    return this.redisService.conversationNewMessageListener();
  }
}
