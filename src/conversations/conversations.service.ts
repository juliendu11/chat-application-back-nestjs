import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Member } from 'src/members/entities/member.entity';
import { MembersService } from 'src/members/members.service';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { Message } from '../rooms/entities/sub/message.entity';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import { GetConversationMessageValue } from './dto/output/conversation-messages.output';
import {
  Conversation,
  ConversationDocument,
} from './entities/conversation.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private memberService:MembersService
  ) {}

  async conversationMessages(
    id: string,
    skip: number,
    limit: number,
  ): Promise<ServiceResponseType<GetConversationMessageValue>> {
    try {
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
            message: '$messages.message',
            date: '$messages.date',
            user: '$messages.user',
            populate: '$messages.populate',
          },
        },
      ]);

      await Promise.all(
        messages.map(async (message) => {
          message.user = (await this.memberService.findOne(
            message.user.toString(),
            ['_id', 'username', 'email', 'profilPic'],
            true,
          )) as Member;
        }),
      );

      return {
        code: 200,
        message: '',
        value: {
          pageAvailable,
          moreAvailable,
          messages,
        },
      };
    } catch (error) {
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

  async findAllWithPopulate(memberId:string, lean = false):Promise<ServiceResponseType<Conversation[]>> {
    try {
      const conversations = await this.conversationModel
      .find({members:{$in:[Types.ObjectId(memberId)]}})
      .populate('last_message.user', 'email username _id profilPic isOnline')
      .populate('members', 'email username _id profilPic isOnline')
      .lean(lean);

      return {
        code:200,
        message:"",
        value:conversations as Conversation[]
      }
    } catch (error) {
      return {
        code:500,
        message:error.message,
        value:[]
      }
    }
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
        await this.addMessage(conversationExist._id, toMemberId, message);
      } else {
        conversationExist = await this.create(toMemberId, memberId, message);
      }

      const conversation = await this.findOneByIdWithPopulate(
        (conversationExist as ConversationDocument)._id.toString(),
        true,
      );

      return {
        code: 200,
        message: '',
        value: conversation as ConversationDocument,
      };
    } catch (error) {
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
