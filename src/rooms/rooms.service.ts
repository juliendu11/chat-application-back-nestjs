import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { CreateRoomInput } from './dto/input/create-room.input';
import { GetRoomMessageValue } from './dto/output/get-room-message.ouput';
import { Room, RoomDocument } from './entities/room.entity';
import { Message } from './entities/sub/message.entity';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>) {}

  async create(
    createRoomInput: CreateRoomInput,
    userId: string,
  ): Promise<ServiceResponseType<Room | null>> {
    try {
      const room = await this.roomModel.create({
        name: createRoomInput.name,
        isPrivate: createRoomInput.isPrivate,
        member: Types.ObjectId(userId),
      });
      return {
        code: 200,
        message: '',
        value: room,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async findAll(): Promise<Room[]> {
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
    return rooms;
  }

  async findOne(id: string): Promise<ServiceResponseType<Room | null>> {
    try {
      const room = await this.roomModel
        .findOne({ _id: Types.ObjectId(id) })
        .lean();
      return {
        code: 200,
        message: '',
        value: room,
      };
    } catch (error) {
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

  async addMessage(
    id: string,
    userId: string,
    message: string,
  ): Promise<ServiceResponseType<Message | null>> {
    try {
      const messageItem: Message = {
        message,
        user: Types.ObjectId(userId),
        date: new Date(),
      };
      await this.roomModel.updateOne(
        { _id: Types.ObjectId(id) },
        { $push: { messages: messageItem }, last_message: messageItem },
      );

      return {
        code: 200,
        message: '',
        value: messageItem,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async remove(id: string): Promise<ServiceResponseType<undefined>> {
    try {
      await this.roomModel.deleteOne({ _id: Types.ObjectId(id) });
      return {
        code: 200,
        message: '',
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
      };
    }
  }
}
