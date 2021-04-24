import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';
import { CreateRoomInput } from './dto/input/create-room.input';
import { CreateRoomOutput } from './dto/output/create-room.output';
import { getResult } from '../helpers/code.helper';
import { GetRoomsOuput } from './dto/output/get-rooms.output';
import { GetRoomOuput } from './dto/output/get-room.output';
import { CommonOutput } from '../common/CommonOutput';
import { AddMessageInput } from './dto/input/add-message.input';
import { AddMessageOuput } from './dto/output/add-message.output';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JWTTokenData } from '../types/JWTToken';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { MembersService } from '../members/members.service';

@Resolver(() => Room)
export class RoomsResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly memberService: MembersService,
  ) {}

  @Mutation(() => CreateRoomOutput)
  @UseGuards(GqlAuthGuard)
  async createRoom(
    @Args('createRoomInput') createRoomInput: CreateRoomInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<CreateRoomOutput> {
    const { code, message, value } = await this.roomsService.create(
      createRoomInput,
      user._id,
    );

    const result = getResult(code);
    if (result) {
      this.memberService.addRoomCreated(user._id, value._id.toString());
    }

    return {
      result,
      message,
      value,
    };
  }

  @Query(() => GetRoomsOuput, { name: 'rooms' })
  @UseGuards(GqlAuthGuard)
  async findAll(): Promise<GetRoomsOuput> {
    const { code, message, value } = await this.roomsService.findAll();
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Query(() => GetRoomOuput, { name: 'room' })
  @UseGuards(GqlAuthGuard)
  async findOne(@Args('id') id: string): Promise<GetRoomOuput> {
    const { code, message, value } = await this.roomsService.findOne(id);
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => AddMessageOuput)
  @UseGuards(GqlAuthGuard)
  async addMessage(
    @Args('addMessageInput') addMessageInput: AddMessageInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<AddMessageOuput> {
    const { code, message, value } = await this.roomsService.addMessage(
      addMessageInput.id,
      user._id,
      addMessageInput.message,
    );
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => CommonOutput)
  @UseGuards(GqlAuthGuard)
  async removeRoom(
    @Args('id') id: string,
    @CurrentUser() user: JWTTokenData,
  ): Promise<CommonOutput> {
    const { code, message } = await this.roomsService.remove(id);

    const result = getResult(code);
    if (result) {
      this.memberService.removeRoomCreated(user._id, id);
    }

    return {
      result,
      message,
    };
  }
}
