import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { UseGuards } from '@nestjs/common';

import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';

import { CreateRoomInput } from './dto/input/create-room.input';
import { CreateRoomOutput } from './dto/output/create-room.output';
import { GetRoomOuput } from './dto/output/get-room.output';
import { AddRoomMessageInput } from './dto/input/add-room-message.input';
import { AddRoomMessageOuput } from './dto/output/add-room-message.output';
import { RoomAddedOutput } from './dto/output/room-added.ouput';
import { RoomMessageAddedOuput } from './dto/output/room-message-added.ouput';

import { getResult } from '../helpers/code.helper';
import { CommonOutput } from '../common/CommonOutput';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JWTTokenData } from '../types/JWTToken';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { MembersService } from '../members/members.service';
import { RedisService } from '../redis/redis.service';
import { ROOM_ADDED, ROOM_MESSAGE_ADDED } from '../redis/redis.pub-sub';
import { ForgotPassword } from '../members/entities/sub/forgot-password.entity';
@Resolver(() => Room)
export class RoomsResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly memberService: MembersService,
    private readonly redisService: RedisService,
  ) {}

  test() {
    let i = 0;
    setInterval(() => {
      this.redisService.roomAddedPublish({
        _id: Types.ObjectId(),
        name: 'Test ' + i,
        isPrivate: false,
        messages: [],
        last_message: {
          message: 'Hey',
          date: new Date(),
          user: {
            _id: Types.ObjectId(),
            username: 'Bob',
            email: 'bob@bobo.com',
            password: '123',
            registration_information: {
              token: 'b',
              date: new Date(),
              expiration_date: new Date(),
            },
            forgot_password: new ForgotPassword(),
            confirmed: true,
            rooms: [],
            profilPic: '',
          },
        },
        member: Types.ObjectId(),
      });
      i++;
    }, 2000);
  }

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
      this.redisService.roomAddedPublish(value);
    }

    return {
      result,
      message,
      value,
    };
  }

  @Query(() => [Room], { name: 'rooms' })
  @UseGuards(GqlAuthGuard)
  async findAll(): Promise<Room[]> {
    return await this.roomsService.findAll();
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
      this.redisService.roomMessageAddedPublish(value, addRoomMessageInput.id);
    }

    return {
      result,
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

  @Subscription(() => RoomAddedOutput, {
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
