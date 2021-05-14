import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';

import { RoomCreateInput } from './dto/input/room-create.input';
import { RoomCreateOutput } from './dto/output/room-create.output';
import { RoomGetOutput } from './dto/output/room-get.output';
import { RoomAddMessageInput } from './dto/input/room-add-message.input';
import { RoomAddMessageOutput } from './dto/output/room-add-message.output';
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
import { RoomGetMessageOuput } from './dto/output/room-get-message.output';
import { RoomGetMessageInput } from './dto/input/room-get-message.input';
import { RoomGetsOutput } from './dto/output/room-gets.output';
import { RoomGetInput } from './dto/input/room-get.input';
@Resolver(() => Room)
export class RoomsResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly memberService: MembersService,
    private readonly redisService: RedisService,
  ) {}

  @Mutation(() => RoomCreateOutput)
  @UseGuards(GqlAuthGuard)
  async roomCreate(
    @Args('roomCreateInput') roomCreateInput: RoomCreateInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<RoomCreateOutput> {
    const { code, message, value } = await this.roomsService.create(
      roomCreateInput,
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

  @Query(() => RoomGetsOutput, { name: 'rooms' })
  @UseGuards(GqlAuthGuard)
  async findAll(): Promise<RoomGetsOutput> {
    const {code, message, value} = await this.roomsService.findAll();

    return {
      result:getResult(code),
      message,
      value
    }
  }

  @Query(() => RoomGetOutput, { name: 'room' })
  @UseGuards(GqlAuthGuard)
  async findOne(@Args('roomGetInput') roomGetInput: RoomGetInput): Promise<RoomGetOutput> {
    const { code, message, value } = await this.roomsService.findOne(roomGetInput.id);
    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Query(() => RoomGetMessageOuput)
  @UseGuards(GqlAuthGuard)
  async roomMessage(
    @Args('roomGetMessageInput') roomGetMessageInput: RoomGetMessageInput,
  ): Promise<RoomGetMessageOuput> {
    const { code, message, value } = await this.roomsService.getRoomMessage(
      roomGetMessageInput.id,
      roomGetMessageInput.skip,
      roomGetMessageInput.limit,
    );

    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => RoomAddMessageOutput)
  @UseGuards(GqlAuthGuard)
  async roomAddMessage(
    @Args('roomAddMessageInput') roomAddMessageInput: RoomAddMessageInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<RoomAddMessageOutput> {
    const { code, message, value } = await this.roomsService.addMessage(
      roomAddMessageInput.id,
      user._id,
      roomAddMessageInput.message,
    );

    const result = getResult(code);
    if (result) {
      await this.publishRoomMessageAdded(value, roomAddMessageInput.id);
    }

    return {
      result,
      message,
      value,
    };
  }

  private async publishRoomMessageAdded(
    value: Message,
    id:string,
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
    this.redisService.roomMessageAddedPublish(value, id);
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
