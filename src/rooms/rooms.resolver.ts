import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';
import { CreateRoomInput } from './dto/input/create-room.input';
import { UpdateRoomInput } from './dto/input/update-room.input';
import { CreateRoomOutput } from './dto/output/create-room.output';
import { getResult } from '../helpers/code.helper';
import { GetRoomsOuput } from './dto/output/get-rooms.output';
import { GetRoomOuput } from './dto/output/get-room.output';
import { CommonOutput } from '../common/CommonOutput';

@Resolver(() => Room)
export class RoomsResolver {
  constructor(private readonly roomsService: RoomsService) {}

  @Mutation(() => CreateRoomOutput)
  async createRoom(
    @Args('createRoomInput') createRoomInput: CreateRoomInput,
  ): Promise<CreateRoomOutput> {
    const { code, message, value } = await this.roomsService.create(
      createRoomInput,
    );
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Query(() => GetRoomsOuput, { name: 'rooms' })
  async findAll(): Promise<GetRoomsOuput> {
    const { code, message, value } = await this.roomsService.findAll();
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Query(() => GetRoomOuput, { name: 'room' })
  async findOne(@Args('id') id: string): Promise<GetRoomOuput> {
    const { code, message, value } = await this.roomsService.findOne(id);
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => CreateRoomOutput)
  async updateRoom(
    @Args('updateRoomInput') updateRoomInput: UpdateRoomInput,
  ): Promise<CreateRoomOutput> {
    const { code, message, value } = await this.roomsService.update(
      updateRoomInput.id,
      updateRoomInput,
    );
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => CommonOutput)
  async removeRoom(@Args('id') id: string): Promise<CommonOutput> {
    const { code, message } = await this.roomsService.remove(id);
    return {
      result: getResult(code),
      message,
    };
  }
}
