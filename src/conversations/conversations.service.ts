import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';

import { getResult } from '../helpers/code.helper';
import { MembersService } from '../members/members.service';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { Message, MessageMedia } from '../rooms/entities/sub/message.entity';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import { GetConversationMessageValue } from './dto/output/conversation-messages.output';
import {
  Conversation,
  ConversationDocument,
} from './entities/conversation.entity';
import { ConversationsOutputValue } from './dto/output/conversations.output';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private memberService: MembersService,
    private logger: NestjsWinstonLoggerService,
  ) {
    logger.setContext(ConversationsService.name);
  }

  async conversationMessages(
    id: string,
    skip: number,
    limit: number,
  ): Promise<ServiceResponseType<GetConversationMessageValue>> {
    try {
      this.logger.log(
        `>>>> [conversationMessages] Use with ${JSON.stringify({
          id,
          skip,
          limit,
        })}`,
      );

      const match = {
        $match: { _id: Types.ObjectId(id) },
      };

      const getMessagesLength = await this.conversationModel.aggregate([
        match,
        { $project: { messages: { $size: '$messages' } } },
      ]);

      const messagesLength = getMessagesLength[0].messages;

      const moreAvailable = messagesLength - (skip + limit) > 0;
      const pageAvailable = Math.ceil(messagesLength / limit);

      const messages = await this.conversationModel.aggregate([
        match,
        { $project: { messages: { $reverseArray: '$messages' } } },
        { $unwind: '$messages' },
        { $limit: limit + skip },
        { $skip: skip },
        {
          $project: {
            medias: '$messages.medias',
            message: '$messages.message',
            date: '$messages.date',
            user: '$messages.user',
            populate: '$messages.populate',
          },
        },
      ]);

      await Promise.all(
        messages.map(async (message) => {
          const getMember = await this.memberService.findOne(
            message.user.toString(),
            ['_id', 'username', 'email', 'profilPic'],
            true,
          );

          if (!getResult(getMember.code) || !getMember.value) {
            throw new Error(
              `Unable to find ${message.user} for populate message`,
            );
          }

          message.user = getMember.value;
        }),
      );

      const response = {
        code: 200,
        message: '',
        value: {
          pageAvailable,
          moreAvailable,
          messages,
        },
      };

      this.logger.log(
        `<<<< [conversationMessages] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [conversationMessages] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: {
          pageAvailable: 0,
          moreAvailable: false,
          messages: [],
        },
      };
    }
  }

  async findAllWithPopulate(
    memberId: string,
    lean = false,
  ): Promise<ServiceResponseType<ConversationsOutputValue[]>> {
    try {
      this.logger.log(
        `>>>> [findAllWithPopulate] Use with ${JSON.stringify({
          memberId,
          lean,
        })}`,
      );

      const conversations = await this.conversationModel
        .find({ members: { $in: [Types.ObjectId(memberId)] } })
        .populate('last_message.user', 'email username _id profilPic isOnline')
        .populate('members', 'email username _id profilPic isOnline')
        .select('-messages')
        .lean(lean);

      const response = {
        code: 200,
        message: '',
        value: conversations as ConversationsOutputValue[],
      };

      this.logger.log(
        `<<<< [findAllWithPopulate] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [findAllWithPopulate] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: [],
      };
    }
  }

  async get(
    toMemberId: string,
    memberId: string,
  ): Promise<ServiceResponseType<Conversation | null>> {
    try {
      this.logger.log(
        `>>>> [getOrCreate] Use with ${JSON.stringify({
          toMemberId,
          memberId,
        })}`,
      );

      const conversationExist = await this.findOne(
        toMemberId,
        memberId,
        ['_id'],
        true,
      );

      const response = {
        code: 200,
        message: '',
        value: conversationExist as ConversationDocument,
      };

      this.logger.log(
        `<<<< [getOrCreate] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [getOrCreate] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async addMessage(
    toMemberId: string,
    { memberId, message }: ConversationSendMessageInput,
    medias: MessageMedia[],
  ): Promise<ServiceResponseType<Conversation | null>> {
    try {
      this.logger.log(
        `>>>> [addOrCreate] Use with ${JSON.stringify({
          toMemberId,
          memberId,
          message,
        })}`,
      );

      const conversationExist = await this.findOne(
        toMemberId,
        memberId,
        ['_id'],
        true,
      );

      const messageItem: Message = this.createMessageItem(
        toMemberId,
        message,
        medias,
      );

      await this.conversationModel.updateOne(
        { _id: Types.ObjectId(conversationExist._id) },
        { $push: { messages: messageItem }, last_message: messageItem },
      );

      const conversation = await this.findOneByIdWithPopulate(
        (conversationExist as ConversationDocument)._id.toString(),
        true,
      );

      const response = {
        code: 200,
        message: '',
        value: conversation as ConversationDocument,
      };

      this.logger.log(
        `<<<< [addOrCreate] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [addOrCreate] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  private async findOneByIdWithPopulate(id: string, lean = false) {
    return await this.conversationModel
      .findById(Types.ObjectId(id))
      .populate('last_message.user', 'email username _id profilPic isOnline')
      .populate('members', 'email username _id profilPic isOnline')
      .lean(lean);
  }

  private async findOne(
    toMemberId: string,
    fromMemberId: string,
    selectedFields = [],
    lean = false,
  ) {
    return await this.conversationModel
      .findOne({
        members: {
          $all: [Types.ObjectId(toMemberId), Types.ObjectId(fromMemberId)],
        },
      })
      .select(selectedFields.join(' '))
      .lean(lean);
  }

  async create(
    toMemberId: string,
    fromMemberId: string,
  ): Promise<ServiceResponseType<ConversationDocument | null>> {
    try {
      this.logger.log(
        `>>>> [create] Use with ${JSON.stringify({
          toMemberId,
          fromMemberId,
        })}`,
      );

      const conversation = await this.conversationModel.create({
        members: [Types.ObjectId(toMemberId), Types.ObjectId(fromMemberId)],
        messages: [],
        last_message: null,
      });

      await conversation
        .populate('members', 'email username _id profilPic isOnline')
        .execPopulate();

      const response = {
        code: 200,
        message: '',
        value: conversation,
      };

      this.logger.log(
        `<<<< [create] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [create] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  private createMessageItem(
    toMemberId: string,
    message: string | null,
    medias: MessageMedia[],
  ): Message {
    return {
      date: new Date(),
      message,
      medias,
      user: Types.ObjectId(toMemberId),
    };
  }
}
