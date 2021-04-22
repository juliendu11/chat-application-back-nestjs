import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { CreateRoomInput } from './dto/input/create-room.input';
import { UpdateRoomInput } from './dto/input/update-room.input';
import { Room, RoomDocument } from './entities/room.entity';
import { Message } from './entities/sub/message.entity';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>) {}

  async create(
    createRoomInput: CreateRoomInput,
  ): Promise<ServiceResponseType<Room | null>> {
    try {
      const room = await this.roomModel.create({
        name: createRoomInput.name,
        isPrivate: createRoomInput.isPrivate,
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

  async findAll(): Promise<ServiceResponseType<Room[]>> {
    try {
      const rooms = await this.roomModel.find({}).lean();
      return {
        code: 200,
        message: '',
        value: rooms,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
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

  async update(
    id: string,
    updateRoomInput: UpdateRoomInput,
  ): Promise<ServiceResponseType<Room | null>> {
    try {
      const message: Message = {
        message: updateRoomInput.message,
        user: Types.ObjectId(updateRoomInput.userId),
        date: updateRoomInput.date,
      };
      const room = await this.roomModel.findByIdAndUpdate(
        { _id: Types.ObjectId(id) },
        { $push: { messages: message } },
        { new: true, useFindAndModify: true, lean: true },
      );

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
