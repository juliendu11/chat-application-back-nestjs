import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { CreateRoomInput } from './dto/input/create-room.input';
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
    return await this.roomModel.find({}).lean();
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
        { $push: { messages: messageItem } },
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
