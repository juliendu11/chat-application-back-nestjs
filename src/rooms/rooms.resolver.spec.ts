import { Test, TestingModule } from '@nestjs/testing';
import { FileUpload } from 'graphql-upload';
import { Types } from 'mongoose';
import { JWTTokenData } from 'src/types/JWTToken';
import { MembersService } from '../members/members.service';
import { RedisService } from '../redis/redis.service';
import { UploadingService } from '../uploading/uploading.service';
import { RoomAddMessageInput } from './dto/input/room-add-message.input';
import { RoomCreateInput } from './dto/input/room-create.input';
import { RoomGetMessageInput } from './dto/input/room-get-message.input';
import { RoomGetInput } from './dto/input/room-get.input';
import { RoomsResolver } from './rooms.resolver';
import { RoomsService } from './rooms.service';

describe('RoomsResolver', () => {
  let resolver: RoomsResolver;

  const mockRoomsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getRoomMessage: jest.fn(),
    addMessage: jest.fn(),
  };

  const mockMembersService = {
    addRoomCreated: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRedisService = {
    roomAddedPublish: jest.fn(),
    roomMessageAddedPublish: jest.fn(),
  };

  const mockUploadingService = {
    uploadRoomMedia: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsResolver,
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: UploadingService,
          useValue: mockUploadingService,
        },
      ],
    }).compile();

    resolver = module.get<RoomsResolver>(RoomsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('roomCreate', () => {
    it('should use create from service with correct args', async (done) => {
      mockRoomsService.create = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: RoomCreateInput = {
        name: 'Test1',
        isPrivate: false,
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toHexString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      await resolver.roomCreate(input, user);

      expect(mockRoomsService.create).toBeCalled();
      expect(mockRoomsService.create).toBeCalledWith(input, user._id);
      done();
    });

    it('should return {result:true, message:"", value:Room} and publish room added with pub sub and add room in member entity who created this because create from service return 200 code', async (done) => {
      const room = {
        name: 'Test1',
        _id: Types.ObjectId(),
      };

      mockRoomsService.create = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: room,
      });

      mockMembersService.addRoomCreated = jest.fn().mockResolvedValue({});
      mockRedisService.roomAddedPublish = jest.fn().mockResolvedValue({});

      const input: RoomCreateInput = {
        name: 'Test1',
        isPrivate: false,
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toHexString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      const result = await resolver.roomCreate(input, user);

      expect(result).toEqual({
        result: true,
        message: '',
        value: room,
      });
      expect(mockMembersService.addRoomCreated).toBeCalled();
      expect(mockMembersService.addRoomCreated).toBeCalledWith(
        user._id,
        room._id.toString(),
      );
      expect(mockRedisService.roomAddedPublish).toBeCalled();
      expect(mockRedisService.roomAddedPublish).toBeCalledWith(room);
      done();
    });

    it('should return {result:false, message:"ErrorMessage", value:null} and NOT publish room added with pub sub and NOT add room in member entity who created this because create from service return 500 code', async (done) => {
      mockRoomsService.create = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      mockMembersService.addRoomCreated = jest.fn().mockResolvedValue({});
      mockRedisService.roomAddedPublish = jest.fn().mockResolvedValue({});

      const input: RoomCreateInput = {
        name: 'Test1',
        isPrivate: false,
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toHexString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      const result = await resolver.roomCreate(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: null,
      });
      expect(mockMembersService.addRoomCreated).not.toBeCalled();
      expect(mockRedisService.roomAddedPublish).not.toBeCalled();
      done();
    });
  });

  describe('findAll', () => {
    it('should use findAll from service', async (done) => {
      mockRoomsService.findAll = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: [],
      });

      await resolver.findAll();

      expect(mockRoomsService.findAll).toBeCalled();
      done();
    });

    it('should return {result:true, message:"", value:[2XRoom]} because findAll from service return 200 code', async (done) => {
      const rooms = [
        { name: 'Test1', _id: Types.ObjectId() },
        { name: 'Test2', _id: Types.ObjectId() },
      ];

      mockRoomsService.findAll = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: rooms,
      });

      const result = await resolver.findAll();

      expect(result).toEqual({
        result: true,
        message: '',
        value: rooms,
      });
      done();
    });

    it('should return {result:false, message:"ErrorMessage", value:[]} because findAll from service return 500 code', async (done) => {
      mockRoomsService.findAll = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: [],
      });

      const result = await resolver.findAll();

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: [],
      });
      done();
    });
  });

  describe('findOne', () => {
    it('should use findOne from service with correct arg', async (done) => {
      mockRoomsService.findOne = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {},
      });

      const input: RoomGetInput = {
        id: Types.ObjectId().toHexString(),
      };

      await resolver.findOne(input);

      expect(mockRoomsService.findOne).toBeCalled();
      expect(mockRoomsService.findOne).toBeCalledWith(input.id);
      done();
    });

    it('should return {result:true, message:"", value:Room} because findOne from service return 200 code', async (done) => {
      const room = {
        name: 'Test1',
      };

      mockRoomsService.findOne = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: room,
      });

      const input: RoomGetInput = {
        id: Types.ObjectId().toHexString(),
      };

      const result = await resolver.findOne(input);

      expect(result).toEqual({
        result: true,
        message: '',
        value: room,
      });
      done();
    });

    it('should return {result:false, message:"ErrorMessage", value:null} because findOne from service return 500 code', async (done) => {
      mockRoomsService.findOne = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: RoomGetInput = {
        id: Types.ObjectId().toHexString(),
      };

      const result = await resolver.findOne(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('roomMessage', () => {
    it('should use getRoomMessage from service with correct args', async (done) => {
      mockRoomsService.getRoomMessage = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {},
      });

      const input: RoomGetMessageInput = {
        id: Types.ObjectId().toHexString(),
        skip: 0,
        limit: 10,
      };

      await resolver.roomMessage(input);

      expect(mockRoomsService.getRoomMessage).toBeCalled();
      expect(mockRoomsService.getRoomMessage).toBeCalledWith(
        input.id,
        input.skip,
        input.limit,
      );
      done();
    });

    it('should return {result:true, message:"", value:{moreAvailable:true, pageAvailable:2, messages:[2xMessages]}} because getRoomMessage from service return 200', async (done) => {
      const value = {
        moreAvailable: true,
        pageAvailable: 2,
        messages: [
          {
            user: Types.ObjectId(),
            date: new Date(),
            message: 'Hello',
            medias: [],
          },
          {
            user: Types.ObjectId(),
            date: new Date(),
            message: 'World',
            medias: [],
          },
        ],
      };

      mockRoomsService.getRoomMessage = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value,
      });

      const input: RoomGetMessageInput = {
        id: Types.ObjectId().toHexString(),
        skip: 0,
        limit: 2,
      };

      const result = await resolver.roomMessage(input);

      expect(result).toEqual({
        result: true,
        message: '',
        value,
      });
      done();
    });

    it('should return {result:false, message:"ErrorMessage", value:{moreAvailable:false, pageAvailable:0, messages:[]}} because getRoomMessage from service return 500 code', async (done) => {
      const value = {
        moreAvailable: false,
        pageAvailable: 0,
        messages: [],
      };

      mockRoomsService.getRoomMessage = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value,
      });

      const input: RoomGetMessageInput = {
        id: Types.ObjectId().toHexString(),
        skip: 0,
        limit: 2,
      };

      const result = await resolver.roomMessage(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value,
      });
      done();
    });
  });

  describe('roomAddMessage', () => {
    it('should use uploadRoomMedia 2 items with correct arg because 2 medias send', async (done) => {
      mockUploadingService.uploadRoomMedia = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: 'path1.png',
      });

      mockRoomsService.addMessage = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const medias1: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'fileToUpload1.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const medias2: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'fileToUpload2.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const input: RoomAddMessageInput = {
        id: Types.ObjectId().toHexString(),
        message: 'Hello world',
        medias: [medias1, medias2],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toHexString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      await resolver.roomAddMessage(input, user);

      expect(mockUploadingService.uploadRoomMedia).toBeCalledTimes(2);

      expect(mockUploadingService.uploadRoomMedia.mock.calls[0][0]).toBe(
        input.id.toString(),
      );
      expect(mockUploadingService.uploadRoomMedia.mock.calls[1][0]).toBe(
        input.id.toString(),
      );
      expect(
        input.medias.some(
          (x) => x === mockUploadingService.uploadRoomMedia.mock.calls[0][1],
        ),
      ).toBe(true);
      expect(
        input.medias.some(
          (x) => x === mockUploadingService.uploadRoomMedia.mock.calls[1][1],
        ),
      ).toBe(true);
      done();
    });

    it('should use addMessage from service with correct args', async (done) => {
      mockRoomsService.addMessage = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: RoomAddMessageInput = {
        id: Types.ObjectId().toHexString(),
        message: 'Hello world',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toHexString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      await resolver.roomAddMessage(input, user);

      expect(mockRoomsService.addMessage).toBeCalled();
      expect(mockRoomsService.addMessage).toBeCalledWith(
        input.id,
        user._id,
        input.message,
        [],
      );
      done();
    });

    it('should return {result:false, message:"", value:null} and not publish room new message because addMessage from service return 500 code', async (done) => {
      mockRoomsService.addMessage = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: RoomAddMessageInput = {
        id: Types.ObjectId().toHexString(),
        message: 'Hello world',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toHexString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      const result = await resolver.roomAddMessage(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });

    it('should return {result:true, message:"", value:Message} and publish room new message because addMessage from service return 200 code', async (done) => {
      const userId = Types.ObjectId();

      const message = {
        user: userId,
        date: new Date(),
        message: 'Hello',
        medias: [],
      };

      const member = {
        username: 'Test1',
        email: 'test@test.com',
      };

      mockMembersService.findOne = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: member,
      });

      mockRoomsService.addMessage = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: message,
      });

      mockRedisService.roomMessageAddedPublish = jest.fn().mockReturnValue({});

      const input: RoomAddMessageInput = {
        id: Types.ObjectId().toHexString(),
        message: 'Hello world',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: userId.toString(),
        username: 'Test1',
        email: 'test@test.com',
        profilPic: 'test.png',
      };

      const result = await resolver.roomAddMessage(input, user);

      expect(result).toEqual({
        result: true,
        message: '',
        value: message,
      });
      expect(mockMembersService.findOne).toBeCalled();
      expect(mockMembersService.findOne).toBeCalledWith(
        userId.toString(),
        ['_id', 'username', 'email', 'profilPic'],
        true,
      );
      expect(mockRedisService.roomMessageAddedPublish).toBeCalled();
      expect(mockRedisService.roomMessageAddedPublish).toBeCalledWith(
        { ...message, user: member },
        input.id,
      );
      done();
    });
  });
});
