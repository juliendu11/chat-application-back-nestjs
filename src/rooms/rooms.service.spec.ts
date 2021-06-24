import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as MockDate from 'mockdate';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { MembersService } from '../members/members.service';
import { RoomCreateInput } from './dto/input/room-create.input';
import { Room } from './entities/room.entity';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;

  const mockRoom = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockMember = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: getModelToken(Room.name),
          useValue: mockRoom,
        },
        {
          provide: NestjsWinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: MembersService,
          useValue: mockMember,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should use create with correct args', async (done) => {
      mockRoom.create = jest.fn().mockResolvedValue({});

      const input: RoomCreateInput = {
        name: 'TestRoom',
        isPrivate: false,
      };

      const userId = Types.ObjectId().toString();

      await service.create(input, userId);

      expect(mockRoom.create).toBeCalled();
      expect(mockRoom.create).toBeCalledWith({
        name: input.name,
        isPrivate: input.isPrivate,
        member: Types.ObjectId(userId),
      });
      done();
    });

    it('should return {code:200, message:"", value:Room} because no error', async (done) => {
      const room = {
        name: 'TestRoom',
      };

      mockRoom.create = jest.fn().mockResolvedValue(room);

      const input: RoomCreateInput = {
        name: 'TestRoom',
        isPrivate: false,
      };

      const userId = Types.ObjectId().toString();

      const result = await service.create(input, userId);

      expect(result).toEqual({
        code: 200,
        message: '',
        value: room,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because create throw Error', async (done) => {
      mockRoom.create = jest.fn().mockRejectedValue(new Error('ErrorMessage'));

      const input: RoomCreateInput = {
        name: 'TestRoom',
        isPrivate: false,
      };

      const userId = Types.ObjectId().toString();

      const result = await service.create(input, userId);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('findAll', () => {
    it('should use find and populate last_message.user with correct fields', async (done) => {
      const execPopulateRoom2 = jest.fn().mockResolvedValue({});
      const execPopulateRoom1 = jest.fn().mockResolvedValue({});

      const rooms = [
        {
          name: 'Room1',
          populate: jest
            .fn()
            .mockReturnValue({ execPopulate: execPopulateRoom1 }),
        },
        {
          name: 'Room2',
          populate: jest
            .fn()
            .mockReturnValue({ execPopulate: execPopulateRoom2 }),
        },
      ];
      mockRoom.find = jest.fn().mockResolvedValue(rooms);

      await service.findAll();

      expect(mockRoom.find).toBeCalled();

      expect(rooms[0].populate).toBeCalled();
      expect(rooms[0].populate).toBeCalledWith({
        path: 'last_message.user',
        select: '_id email username profilPic',
      });

      expect(rooms[1].populate).toBeCalled();
      expect(rooms[1].populate).toBeCalledWith({
        path: 'last_message.user',
        select: '_id email username profilPic',
      });

      expect(execPopulateRoom1).toBeCalled();
      expect(execPopulateRoom2).toBeCalled();
      done();
    });

    it('should return {code:200, message:"", value:[2xRoom]} because no error', async (done) => {
      const populateRoom1 = {
        name: 'Room1',
        last_message: {
          user: {
            _id: Types.ObjectId(),
            email: 'test@test.com',
            username: 'test',
            profilPic: 'test.png',
          },
          date: new Date(),
          message: 'Hello',
          medias: [],
        },
      };

      const populateRoom2 = {
        name: 'Room2',
        last_message: {
          user: {
            _id: Types.ObjectId(),
            email: 'test2@test.com',
            username: 'test2',
            profilPic: 'test2.png',
          },
          date: new Date(),
          message: 'World',
          medias: [],
        },
      };

      const execPopulateRoom2 = jest.fn().mockResolvedValue(populateRoom1);
      const execPopulateRoom1 = jest.fn().mockResolvedValue(populateRoom2);

      const rooms = [
        {
          name: 'Room1',
          populate: jest
            .fn()
            .mockReturnValue({ execPopulate: execPopulateRoom1 }),
        },
        {
          name: 'Room2',
          populate: jest
            .fn()
            .mockReturnValue({ execPopulate: execPopulateRoom2 }),
        },
      ];
      mockRoom.find = jest.fn().mockResolvedValue(rooms);

      const result = await service.findAll();

      expect(result.code).toBe(200);
      expect(result.message).toBe('');
      expect(result.value.length).toBe(2);
      expect(result.value.some((x) => x.name === populateRoom1.name)).toBe(
        true,
      );
      expect(result.value.some((x) => x.name === populateRoom2.name)).toBe(
        true,
      );
      expect(
        (result.value as any).some(
          (x) =>
            x.last_message.user.username ===
            populateRoom1.last_message.user.username,
        ),
      ).toBe(true);
      expect(
        (result.value as any).some(
          (x) =>
            x.last_message.user.username ===
            populateRoom2.last_message.user.username,
        ),
      ).toBe(true);
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:[]} because find throw Error', async (done) => {
      mockRoom.find = jest.fn().mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.findAll();

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: [],
      });
      done();
    });
  });

  describe('findOne', () => {
    it('should use findOne with correct args', async (done) => {
      const room = {
        name: 'Room1',
      };

      const lean = jest.fn().mockResolvedValue(room);
      mockRoom.findOne = jest.fn().mockReturnValue({ lean });

      const roomId = Types.ObjectId().toString();

      await service.findOne(roomId);

      expect(mockRoom.findOne).toBeCalled();
      expect(mockRoom.findOne).toBeCalledWith({ _id: Types.ObjectId(roomId) });
      done();
    });

    it('should return {code:200, message:"", value:Room} because not error', async (done) => {
      const room = {
        name: 'Room1',
      };

      const lean = jest.fn().mockResolvedValue(room);
      mockRoom.findOne = jest.fn().mockReturnValue({ lean });

      const roomId = Types.ObjectId().toString();

      const result = await service.findOne(roomId);

      expect(result).toEqual({
        code: 200,
        message: '',
        value: room,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because findOne throw Error', async (done) => {
      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      mockRoom.findOne = jest.fn().mockReturnValue({ lean });

      const roomId = Types.ObjectId().toString();

      const result = await service.findOne(roomId);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('getRoomMessage', () => {
    it('should use aggregate for get messages length with correct args', async (done) => {
      mockRoom.aggregate = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const values = {
        id: Types.ObjectId().toString(),
        skip: 0,
        limit: 10,
      };

      await service.getRoomMessage(values.id, values.skip, values.limit);

      expect(mockRoom.aggregate).toBeCalled();
      expect(mockRoom.aggregate).toBeCalledWith([
        {
          $match: { _id: Types.ObjectId(values.id) },
        },
        { $project: { messages: { $size: '$messages' } } },
      ]);
      done();
    });

    it('should use aggregate for get messages with correct args', async (done) => {
      mockRoom.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ messages: 10 }])
        .mockRejectedValue(new Error('ErrorMessage'));

      const values = {
        id: Types.ObjectId().toString(),
        skip: 0,
        limit: 10,
      };

      await service.getRoomMessage(values.id, values.skip, values.limit);

      expect(mockRoom.aggregate).toBeCalled();
      expect(mockRoom.aggregate).toBeCalledTimes(2);
      expect(mockRoom.aggregate.mock.calls[1][0]).toEqual([
        {
          $match: { _id: Types.ObjectId(values.id) },
        },
        { $project: { messages: { $reverseArray: '$messages' } } },
        { $unwind: '$messages' },
        { $limit: 10 },
        { $skip: 0 },
        {
          $project: {
            medias: '$messages.medias',
            message: '$messages.message',
            date: '$messages.date',
            user: '$messages.user',
            populate: '$messages.populate',
          },
        },
      ]);
      done();
    });

    it('should return {code:200, message:"", value:{pageAvailable:2, moreAvailable:true, messages:[5xMessage]}} and populate message.user', async (done) => {
      const messages = [];

      for (let i = 0; i < 5; i++) {
        messages.push({
          medias: [],
          message: 'Hello' + i,
          date: new Date(),
          user: Types.ObjectId(),
        });
      }

      mockRoom.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ messages: 10 }])
        .mockResolvedValue(messages);

      mockMember.findOne = jest.fn().mockResolvedValue({
        code: 200,
        value: {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'test.png',
        },
      });

      const values = {
        id: Types.ObjectId().toString(),
        skip: 0,
        limit: 5,
      };

      const result = await service.getRoomMessage(
        values.id,
        values.skip,
        values.limit,
      );

      const _messages = messages.map((message) => {
        message.user = {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'test.png',
        };
        return message;
      });

      expect(result).toEqual({
        code: 200,
        message: '',
        value: {
          pageAvailable: 2,
          moreAvailable: true,
          messages: _messages,
        },
      });
      expect(mockMember.findOne).toBeCalled();
      expect(mockMember.findOne).toBeCalledTimes(5);
      done();
    });

    it('should return {code:200, message:"", value:{pageAvailable:2, moreAvailable:false, messages:[5xMessage]}} because limit is 5 and 10 messages available and 5 skip (2 page)', async (done) => {
      const messages = [];

      for (let i = 0; i < 5; i++) {
        messages.push({
          medias: [],
          message: 'Hello' + i,
          date: new Date(),
          user: Types.ObjectId(),
        });
      }

      mockRoom.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ messages: 10 }])
        .mockResolvedValue(messages);

      mockMember.findOne = jest.fn().mockResolvedValue({
        code: 200,
        value: {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'test.png',
        },
      });

      const values = {
        id: Types.ObjectId().toString(),
        skip: 5,
        limit: 5,
      };

      const result = await service.getRoomMessage(
        values.id,
        values.skip,
        values.limit,
      );

      const _messages = messages.map((message) => {
        message.user = {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'test.png',
        };
        return message;
      });

      expect(result).toEqual({
        code: 200,
        message: '',
        value: {
          pageAvailable: 2,
          moreAvailable: false,
          messages: _messages,
        },
      });
      expect(mockMember.findOne).toBeCalled();
      expect(mockMember.findOne).toBeCalledTimes(5);
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:{pageAvailable:0, moreAvailable:false, messages:[]}} because aggregate throw Error', async (done) => {
      mockRoom.aggregate = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const values = {
        id: Types.ObjectId().toString(),
        skip: 5,
        limit: 5,
      };

      const result = await service.getRoomMessage(
        values.id,
        values.skip,
        values.limit,
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: {
          pageAvailable: 0,
          moreAvailable: false,
          messages: [],
        },
      });
      done();
    });
  });

  describe('addMessage', () => {
    it('should use updateOne with correct args', async (done) => {
      mockRoom.updateOne = jest.fn().mockResolvedValue({});

      const values = {
        id: Types.ObjectId().toString(),
        userId: Types.ObjectId().toString(),
        message: 'Hello',
        mediaPath: [],
      };

      await service.addMessage(
        values.id,
        values.userId,
        values.message,
        values.mediaPath,
      );

      const messageItem = {
        message: values.message,
        user: Types.ObjectId(values.userId),
        date: new Date(),
        medias: values.mediaPath,
      };

      expect(mockRoom.updateOne).toBeCalled();
      expect(mockRoom.updateOne).toBeCalledWith(
        { _id: Types.ObjectId(values.id) },
        { $push: { messages: messageItem }, last_message: messageItem },
      );
      done();
    });

    it('should return {code:200, message:"", value:MessageItem} because no error', async (done) => {
      MockDate.set(new Date());
      mockRoom.updateOne = jest.fn().mockResolvedValue({});

      const values = {
        id: Types.ObjectId().toString(),
        userId: Types.ObjectId().toString(),
        message: 'Hello',
        mediaPath: [],
      };

      const result = await service.addMessage(
        values.id,
        values.userId,
        values.message,
        values.mediaPath,
      );

      const messageItem = {
        message: values.message,
        user: Types.ObjectId(values.userId),
        date: new Date(),
        medias: values.mediaPath,
      };

      expect(result).toEqual({
        code: 200,
        message: '',
        value: messageItem,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because updateOne throw Error', async (done) => {
      mockRoom.updateOne = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const values = {
        id: Types.ObjectId().toString(),
        userId: Types.ObjectId().toString(),
        message: 'Hello',
        mediaPath: [],
      };

      const result = await service.addMessage(
        values.id,
        values.userId,
        values.message,
        values.mediaPath,
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('remove', () => {
    it('should use deleteOne with correct args', async (done) => {
      mockRoom.deleteOne = jest.fn().mockResolvedValue({});

      const id = Types.ObjectId().toHexString();

      await service.remove(id);

      expect(mockRoom.deleteOne).toBeCalled();
      expect(mockRoom.deleteOne).toBeCalledWith({ _id: Types.ObjectId(id) });
      done();
    });

    it('should return {code:200, message:""} because no error', async (done) => {
      mockRoom.deleteOne = jest.fn().mockResolvedValue({});

      const id = Types.ObjectId().toHexString();

      const result = await service.remove(id);

      expect(result).toEqual({
        code: 200,
        message: '',
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage"} because deleteOne throw Error', async (done) => {
      mockRoom.deleteOne = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const id = Types.ObjectId().toHexString();

      const result = await service.remove(id);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
      });
      done();
    });
  });
});
