import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { getResult } from 'src/helpers/code.helper';
import { MembersService } from 'src/members/members.service';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { RoomCreateInput } from './dto/input/room-create.input';
import { GetRoomMessageValue } from './dto/output/room-get-message.output';
import { Room, RoomDocument } from './entities/room.entity';
import { Message } from './entities/sub/message.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    private memberService: MembersService,
    private logger: NestjsWinstonLoggerService,
  ) {
    logger.setContext(RoomsService.name);
  }

  async create(
    createRoomInput: RoomCreateInput,
    userId: string,
  ): Promise<ServiceResponseType<Room | null>> {
    try {
      this.logger.log(
        `>>>> [create] Use with ${JSON.stringify({ createRoomInput, userId })}`,
      );

      const room = await this.roomModel.create({
        name: createRoomInput.name,
        isPrivate: createRoomInput.isPrivate,
        member: Types.ObjectId(userId),
      });

      const response = {
        code: 200,
        message: '',
        value: room,
      };

      this.logger.log(
        `<<<< [findAll] Response: ${JSON.stringify({ response })}`,
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

  async findAll(): Promise<ServiceResponseType<Room[]>> {
    try {
      this.logger.log(`>>>> [findAll] Use`);

      const rooms = await this.roomModel.find({});
      await Promise.all(
        rooms.map(async (room) => {
          await room
            .populate({
              path: 'last_message.user',
              select: '_id email username profilPic',
            })
            .execPopulate();
        }),
      );

      const response = {
        code: 200,
        message: '',
        value: rooms,
      };

      this.logger.log(
        `<<<< [findAll] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [findAll] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: [],
      };
    }
  }

  async findOne(id: string): Promise<ServiceResponseType<Room | null>> {
    try {
      this.logger.log(`>>>> [findOne] Use with ${JSON.stringify({ id })}`);

      const room = await this.roomModel
        .findOne({ _id: Types.ObjectId(id) })
        .lean();

      const response = {
        code: 200,
        message: '',
        value: room,
      };

      this.logger.log(
        `<<<< [findAll] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [findOne] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async getRoomMessage(
    id: string,
    skip: number,
    limit: number,
  ): Promise<ServiceResponseType<GetRoomMessageValue>> {
    try {
      this.logger.log(
        `>>>> [getRoomMessage] Use with ${JSON.stringify({ id, skip, limit })}`,
      );

      const match = {
        $match: { _id: Types.ObjectId(id) },
      };

      const getMessagesLength = await this.roomModel.aggregate([
        match,
        { $project: { messages: { $size: '$messages' } } },
      ]);

      const messagesLength = getMessagesLength[0].messages;

      const moreAvailable = messagesLength - (skip + limit) > 0;
      const pageAvailable = Math.ceil(messagesLength / limit);

      const messages = await this.roomModel.aggregate([
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
        `<<<< [getRoomMessage] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [getRoomMessage] Exception`, error);

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

  async addMessage(
    id: string,
    userId: string,
    message: string,
  ): Promise<ServiceResponseType<Message | null>> {
    try {
      this.logger.log(
        `>>>> [addMessage] Use with ${JSON.stringify({ id, userId, message })}`,
      );

      const messageItem: Message = {
        message,
        user: Types.ObjectId(userId),
        date: new Date(),
        media: null,
      };

      await this.roomModel.updateOne(
        { _id: Types.ObjectId(id) },
        { $push: { messages: messageItem }, last_message: messageItem },
      );

      const response = {
        code: 200,
        message: '',
        value: messageItem,
      };

      this.logger.log(
        `<<<< [addMessage] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [addMessage] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async remove(id: string): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(`>>>> [remove] Use with ${JSON.stringify({ id })}`);

      await this.roomModel.deleteOne({ _id: Types.ObjectId(id) });

      const response = {
        code: 200,
        message: '',
      };

      this.logger.log(
        `<<<< [remove] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [remove] Exception`, error);

      return {
        code: 500,
        message: error.message,
      };
    }
  }
}
