import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { Message } from '../rooms/entities/sub/message.entity';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import {
  Conversation,
  ConversationDocument,
} from './entities/conversation.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async findAllWithPopulate(lean = false) {
    return await this.conversationModel
      .find({})
      .populate('last_message.user', 'email username _id profilPic')
      .populate('members', 'email username _id profilPic')
      .lean(lean);
  }

  async findOneByIdWithPopulate(id: string, lean = false) {
    return await this.conversationModel
      .findById(Types.ObjectId(id))
      .populate('last_message.user', 'email username _id profilPic')
      .populate('members', 'email username _id profilPic')
      .lean(lean);
  }

  async addOrCreate(
    toMemberId: string,
    { memberId, message }: ConversationSendMessageInput,
  ): Promise<ServiceResponseType<Conversation | null>> {
    try {
      let conversationExist = await this.findOne(
        toMemberId,
        memberId,
        ['_id'],
        true,
      );
      if (conversationExist) {
        await this.addMessage(conversationExist._id, memberId, message);
      } else {
        conversationExist = await this.create(toMemberId, memberId, message);
      }

      return {
        code: 200,
        message: '',
        value: conversationExist as ConversationDocument,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  private async findOne(
    toMemberId: string,
    fromMemberId: string,
    selectedFields = [],
    lean = false,
  ) {
    return await this.conversationModel
      .findOne({
        favoriteFood: {
          $all: [Types.ObjectId(toMemberId), Types.ObjectId(fromMemberId)],
        },
      })
      .select(selectedFields.join(' '))
      .lean(lean);
  }

  private async create(
    toMemberId: string,
    fromMemberId: string,
    message: string,
  ) {
    const messageItem: Message = this.createMessageItem(toMemberId, message);

    const conversation = await this.conversationModel.create({
      members: [Types.ObjectId(toMemberId), Types.ObjectId(fromMemberId)],
      messages: [messageItem],
      last_message: messageItem,
    });

    return conversation;
  }

  private async addMessage(
    conversationId: string,
    toMemberId: string,
    message: string,
  ) {
    const messageItem: Message = this.createMessageItem(toMemberId, message);

    await this.conversationModel.updateOne(
      { _id: Types.ObjectId(conversationId) },
      { $push: { messages: messageItem }, last_message: messageItem },
    );
  }

  private createMessageItem(toMemberId: string, message: string): Message {
    return {
      date: new Date(),
      message,
      user: Types.ObjectId(toMemberId),
    };
  }
}
