import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';

import { CreateRoomInput } from './dto/input/create-room.input';
import { CreateRoomOutput } from './dto/output/create-room.output';
import { GetRoomOuput } from './dto/output/get-room.output';
import { AddRoomMessageInput } from './dto/input/add-room-message.input';
import { AddRoomMessageOuput } from './dto/output/add-room-message.output';
import { RoomMessageAddedOuput } from './dto/output/room-message-added.ouput';

import { getResult } from '../helpers/code.helper';
import { CommonOutput } from '../common/CommonOutput';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JWTTokenData } from '../types/JWTToken';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { MembersService } from '../members/members.service';
import { RedisService } from '../redis/redis.service';
import { ROOM_ADDED, ROOM_MESSAGE_ADDED } from '../redis/redis.pub-sub';
import { Member } from '../members/entities/member.entity';
import { Message } from './entities/sub/message.entity';
import { GetRoomMessageOuput } from './dto/output/get-room-message.ouput';
import { GetRoomMessageInput } from './dto/input/get-room-message.input';
import { GetRoomsOuput } from './dto/output/get-rooms.output';
@Resolver(() => Room)
export class RoomsResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly memberService: MembersService,
    private readonly redisService: RedisService,
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
      this.publishRoomAdded(user, value);
    }

    return {
      result,
      message,
      value,
    };
  }

  private publishRoomAdded(user: JWTTokenData, value: Room) {
    this.memberService.addRoomCreated(user._id, value._id.toString());
    this.redisService.roomAddedPublish(value);
  }

  @Query(() => GetRoomsOuput, { name: 'rooms' })
  @UseGuards(GqlAuthGuard)
  async findAll(): Promise<GetRoomsOuput> {
    const {code, message, value} = await this.roomsService.findAll();

    return {
      result:getResult(code),
      message,
      value
    }
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

  @Query(() => GetRoomMessageOuput)
  @UseGuards(GqlAuthGuard)
  async roomMessage(
    @Args('getRoomMessageInput') getRoomMessageInput: GetRoomMessageInput,
  ): Promise<GetRoomMessageOuput> {
    const { code, message, value } = await this.roomsService.getRoomMessage(
      getRoomMessageInput.id,
      getRoomMessageInput.skip,
      getRoomMessageInput.limit,
    );

    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => AddRoomMessageOuput)
  @UseGuards(GqlAuthGuard)
  async addRoomMessage(
    @Args('addRoomMessageInput') addRoomMessageInput: AddRoomMessageInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<AddRoomMessageOuput> {
    const { code, message, value } = await this.roomsService.addMessage(
      addRoomMessageInput.id,
      user._id,
      addRoomMessageInput.message,
    );

    const result = getResult(code);
    if (result) {
      await this.publishRoomMessageAdded(value, addRoomMessageInput);
    }

    return {
      result,
      message,
      value,
    };
  }

  private async publishRoomMessageAdded(
    value: Message,
    addRoomMessageInput: AddRoomMessageInput,
  ) {
    const member = await this.memberService.findOne(
      value.user.toString(),
      ['_id', 'username', 'email', 'profilPic'],
      true,
    );
    if(!getResult(member.code)||!member.value){
      throw new Error(`Unable to find ${value.user} for publish new room message`)
    }

    value.user = member.value as Member;
    this.redisService.roomMessageAddedPublish(value, addRoomMessageInput.id);
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

  @Subscription(() => Room, {
    name: ROOM_ADDED,
  })
  roomAddedHandler() {
    return this.redisService.roomAddedListener();
  }

  @Subscription(() => RoomMessageAddedOuput, {
    name: ROOM_MESSAGE_ADDED,
  })
  roomMessageAddedHandler() {
    return this.redisService.roomMessageAddedListener();
  }
}
