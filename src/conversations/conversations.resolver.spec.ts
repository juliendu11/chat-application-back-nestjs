import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { RedisService } from '../redis/redis.service';
import { MembersService } from '../members/members.service';
import { ConversationsResolver } from './conversations.resolver';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { UploadingService } from '../uploading/uploading.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { JWTTokenData } from 'src/types/JWTToken';
import { ConversationsOutputValue } from './dto/output/conversations.output';
import { ConversationMessageInput } from './dto/input/conversation-messages.input';
import { GetConversationMessageValue } from './dto/output/conversation-messages.output';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import { FileUpload } from 'graphql-upload';
import { Member } from 'src/members/entities/member.entity';

describe('ConversationsResolver', () => {
  let resolver: ConversationsResolver;
  let service: ConversationsService;

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockMember = {};

  const mockConversation = {};

  const mockRedisService = {
    conversationAddedPublish: jest.fn(),
    conversationNewMessagePublish: jest.fn(),
  };

  const mockUploadingService = {
    uploadConversationMedia: jest.fn(),
  };

  const mockEventEmitter2 = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsResolver,
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversation,
        },
        {
          provide: NestjsWinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: MembersService,
          useValue: mockMember,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: UploadingService,
          useValue: mockUploadingService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter2,
        },
      ],
    }).compile();

    resolver = module.get<ConversationsResolver>(ConversationsResolver);
    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should use findAllWithPopulate from service with correct args', async (done) => {
      service.findAllWithPopulate = jest
        .fn()
        .mockResolvedValue({ code: 500, message: 'Error', value: null });

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      await resolver.findAll(user);

      expect(service.findAllWithPopulate).toBeCalled();
      expect(service.findAllWithPopulate).toBeCalledWith(user._id, true);
      done();
    });

    it("should return {result:false, message:'Error', value:null} because findAllWithPopulate from service return 500 code", async (done) => {
      service.findAllWithPopulate = jest
        .fn()
        .mockResolvedValue({ code: 500, message: 'Error', value: null });

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      const result = await resolver.findAll(user);

      expect(result).toEqual({
        result: false,
        message: 'Error',
        value: null,
      });
      done();
    });

    it("should return {result:true, message:'', value:ConversationsOutputValue[]} because findAllWithPopulate from service return 200 code", async (done) => {
      const value: ConversationsOutputValue[] = [
        {
          _id: Types.ObjectId(),
          members: [],
          last_message: null,
        },
      ];

      service.findAllWithPopulate = jest
        .fn()
        .mockResolvedValue({ code: 200, message: '', value });

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      const result = await resolver.findAll(user);

      expect(result).toEqual({
        result: true,
        message: '',
        value,
      });
      done();
    });
  });

  describe('conversationMessages', () => {
    it('should use conversationMessages from service with correct args', async (done) => {
      service.conversationMessages = jest
        .fn()
        .mockResolvedValue({ code: 500, message: 'Error', value: null });

      const input: ConversationMessageInput = {
        skip: 0,
        limit: 10,
        id: Types.ObjectId().toString(),
      };

      await resolver.conversationMessages(input);

      expect(service.conversationMessages).toBeCalled();
      expect(service.conversationMessages).toBeCalledWith(
        input.id,
        input.skip,
        input.limit,
      );
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because conversationMessages return 500 code', async (done) => {
      service.conversationMessages = jest
        .fn()
        .mockResolvedValue({ code: 500, message: 'ErrorMessage', value: null });

      const input: ConversationMessageInput = {
        skip: 0,
        limit: 10,
        id: Types.ObjectId().toString(),
      };

      const result = await resolver.conversationMessages(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });

    it('should return {code:200, message:"", value:null} because conversationMessages return 200 code', async (done) => {
      const value: GetConversationMessageValue = {
        moreAvailable: false,
        pageAvailable: 2,
        messages: [],
      };

      service.conversationMessages = jest
        .fn()
        .mockResolvedValue({ code: 200, message: '', value });

      const input: ConversationMessageInput = {
        skip: 0,
        limit: 10,
        id: Types.ObjectId().toString(),
      };

      const result = await resolver.conversationMessages(input);

      expect(result).toEqual({
        result: true,
        message: '',
        value,
      });
      done();
    });
  });

  describe('conversationSendMessage', () => {
    it('should use get from service with correct args', async (done) => {
      service.get = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      await resolver.conversationSendMessage(input, user);

      expect(service.get).toBeCalled();
      expect(service.get).toBeCalledWith(user._id, input.memberId);
      done();
    });

    it("should return {result:false, message:'ErrorMessage'} because get from service return 500 code", async (done) => {
      service.get = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      const result = await resolver.conversationSendMessage(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      done();
    });

    it("should use create from service because conversation not exist and NOT trigger redis pubsub 'conversation added' and return {result:false, message:'ErrorMessage'} because create return 500 code", async (done) => {
      service.get = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: null,
      });

      service.create = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      const result = await resolver.conversationSendMessage(input, user);

      expect(service.create).toBeCalled();
      expect(service.create).toBeCalledWith(user._id, input.memberId);
      expect(mockRedisService.conversationAddedPublish).not.toBeCalled();

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      done();
    });

    it("should use create from service because conversation not exist and trigger redis pubsub 'conversation added' because create return 200 code", async (done) => {
      service.get = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: null,
      });

      const newConversation = {
        _id: Types.ObjectId(),
      };

      service.create = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: newConversation,
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      await resolver.conversationSendMessage(input, user);

      expect(service.create).toBeCalled();
      expect(service.create).toBeCalledWith(user._id, input.memberId);
      expect(mockRedisService.conversationAddedPublish).toBeCalled();
      expect(mockRedisService.conversationAddedPublish).toBeCalledWith(
        newConversation,
      );
      done();
    });

    it('should NOT use uploadConversationMedia from uploadingService because send 0 media', async (done) => {
      mockUploadingService.uploadConversationMedia = jest
        .fn()
        .mockResolvedValue({
          code: 400,
          value: null,
          message: 'ErrorMessage',
        });

      const conversation = {
        _id: Types.ObjectId(),
      };

      service.get = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: conversation,
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      await resolver.conversationSendMessage(input, user);

      expect(mockUploadingService.uploadConversationMedia).not.toBeCalled();
      done();
    });

    it('should use uploadConversationMedia from uploadingService because send 1 media', async (done) => {
      mockUploadingService.uploadConversationMedia = jest
        .fn()
        .mockResolvedValue({
          code: 200,
          value: 'uploads/newImage.png',
          message: '',
        });

      const conversation = {
        _id: Types.ObjectId(),
      };

      service.get = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: conversation,
      });

      const medias: Promise<FileUpload>[] = [];

      const promise1: Promise<FileUpload> = new Promise((resolve, reject) => {
        resolve({
          filename: 'test.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      medias.push(promise1);

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias,
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      await resolver.conversationSendMessage(input, user);

      expect(mockUploadingService.uploadConversationMedia).toBeCalledTimes(1);
      expect(mockUploadingService.uploadConversationMedia).toBeCalledWith(
        conversation._id.toString(),
        medias[0],
      );
      done();
    });

    it("should return {result:false, message:'ErrorMessage'} and NOT use redis pub sub with new message and NOT event emitter 'added.pm' with new message because addMessage from service return 500 code", async (done) => {
      const conversation = {
        _id: Types.ObjectId(),
      };

      service.get = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: conversation,
      });

      service.addMessage = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: '',
        medias: [],
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'test',
        profilPic: 'test.png',
      };

      const result = await resolver.conversationSendMessage(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      expect(mockRedisService.conversationNewMessagePublish).not.toBeCalled();
      expect(mockEventEmitter2.emit).not.toBeCalled();
      done();
    });

    it("should return {result:true, message:''} and use redis pub sub with new message and event emitter 'added.pm' with new message", async (done) => {
      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
      };

      const members = [
        { _id: user._id, username: 'Test1' },
        { _id: Types.ObjectId().toString(), username: 'Test2' },
      ];

      const newMessage = {
        last_message: {
          message: 'Hello',
        },
        _id: Types.ObjectId(),
        members: members,
      };

      const conversation = {
        _id: Types.ObjectId(),
        members: members,
      };

      service.get = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: conversation,
      });

      service.addMessage = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: newMessage,
      });

      const input: ConversationSendMessageInput = {
        memberId: Types.ObjectId().toString(),
        message: 'Hello',
        medias: [],
      };

      const result = await resolver.conversationSendMessage(input, user);

      expect(mockRedisService.conversationNewMessagePublish).toBeCalled();
      expect(mockRedisService.conversationNewMessagePublish).toBeCalledWith({
        last_message: newMessage.last_message,
        _id: newMessage._id,
        members: (newMessage.members as unknown) as Member[],
      });

      expect(mockEventEmitter2.emit).toBeCalled();
      expect(mockEventEmitter2.emit).toBeCalledWith(
        'added.pm',
        input.memberId,
        'New message from Test1: Hello',
      );

      expect(result).toEqual({
        result: true,
        message: '',
      });
      done();
    });
  });
});
