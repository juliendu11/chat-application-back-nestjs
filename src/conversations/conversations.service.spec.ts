import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as MockDate from 'mockdate';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { MembersService } from '../members/members.service';
import { ConversationsService } from './conversations.service';
import { ConversationSendMessageInput } from './dto/input/conversation-send-message.input';
import { Conversation } from './entities/conversation.entity';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const mockConversation = {
    aggregate: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('conversationMessages', () => {
    it('should get messages length with correct args', async (done) => {
      const id = Types.ObjectId();

      mockConversation.aggregate = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      await service.conversationMessages(id.toString(), 0, 5);

      expect(mockConversation.aggregate).toBeCalled();
      expect(mockConversation.aggregate).toBeCalledWith([
        {
          $match: { _id: Types.ObjectId(id.toString()) },
        },
        { $project: { messages: { $size: '$messages' } } },
      ]);
      done();
    });

    it('should get messages with correct args', async (done) => {
      const id = Types.ObjectId();

      const messages = [];

      for (let i = 0; i < 5; i++) {
        messages.push({
          user: Types.ObjectId(),
          date: new Date(),
          message: 'msg' + i,
          medias: [],
        });
      }

      mockConversation.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ messages: 10 }])
        .mockResolvedValueOnce(messages);

      await service.conversationMessages(id.toString(), 0, 5);

      expect(mockConversation.aggregate.mock.calls.length).toBe(2);
      expect(mockConversation.aggregate.mock.calls[1][0]).toEqual([
        {
          $match: { _id: Types.ObjectId(id.toString()) },
        },
        { $project: { messages: { $reverseArray: '$messages' } } },
        { $unwind: '$messages' },
        { $limit: 0 + 5 },
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

    it("should return {code:500, message:'ErrorMessage', value:{pageAvailable:0, moreAvailable:false, messages:[]}} because aggregate throw Error", async (done) => {
      const id = Types.ObjectId();

      mockConversation.aggregate = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.conversationMessages(id.toString(), 0, 5);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: {
          messages: [],
          pageAvailable: 0,
          moreAvailable: false,
        },
      });
      done();
    });

    it("should return {code:200, message:'', value:{pageAvailable:2, moreAvailable:true, messages}} because 10 messages available for this conversation and limit is 5 so 2 pages are available and we are on the first page", async (done) => {
      const id = Types.ObjectId();

      const messages = [];

      const members = [
        {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'Test1.png',
        },
        {
          _id: Types.ObjectId(),
          username: 'Test2',
          email: 'test2@test.com',
          profilPic: 'Test2.png',
        },
        {
          _id: Types.ObjectId(),
          username: 'Test3',
          email: 'test3@test.com',
          profilPic: 'Test3.png',
        },
      ];

      for (let i = 0; i < 5; i++) {
        messages.push({
          user: members[Math.floor(Math.random() * members.length)],
          date: new Date(),
          message: 'msg' + i,
          medias: [],
        });
      }

      mockConversation.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ messages: 10 }])
        .mockResolvedValueOnce(messages);

      mockMember.findOne = jest
        .fn()
        .mockResolvedValueOnce({ code: 200, value: members[0] })
        .mockResolvedValueOnce({ code: 200, value: members[0] })
        .mockResolvedValueOnce({ code: 200, value: members[1] })
        .mockResolvedValueOnce({ code: 200, value: members[2] })
        .mockResolvedValueOnce({ code: 200, value: members[2] });

      const result = await service.conversationMessages(id.toString(), 0, 5);

      const messagesField = messages;
      messagesField[0].user = members[0];
      messagesField[1].user = members[0];
      messagesField[2].user = members[1];
      messagesField[3].user = members[2];
      messagesField[4].user = members[2];

      expect(result).toEqual({
        code: 200,
        message: '',
        value: {
          messages: messagesField,
          pageAvailable: 2,
          moreAvailable: true,
        },
      });
      done();
    });

    it("should return {code:200, message:'', value:{pageAvailable:2, moreAvailable:false, messages}} because 10 messages available for this conversation and limit is 5 so 2 pages are available and we are on the second page", async (done) => {
      const id = Types.ObjectId();

      const messages = [];

      const members = [
        {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'Test1.png',
        },
        {
          _id: Types.ObjectId(),
          username: 'Test2',
          email: 'test2@test.com',
          profilPic: 'Test2.png',
        },
        {
          _id: Types.ObjectId(),
          username: 'Test3',
          email: 'test3@test.com',
          profilPic: 'Test3.png',
        },
      ];

      for (let i = 0; i < 5; i++) {
        messages.push({
          user: members[Math.floor(Math.random() * members.length)],
          date: new Date(),
          message: 'msg' + i,
          medias: [],
        });
      }

      mockConversation.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ messages: 10 }])
        .mockResolvedValueOnce(messages);

      mockMember.findOne = jest
        .fn()
        .mockResolvedValueOnce({ code: 200, value: members[0] })
        .mockResolvedValueOnce({ code: 200, value: members[0] })
        .mockResolvedValueOnce({ code: 200, value: members[1] })
        .mockResolvedValueOnce({ code: 200, value: members[2] })
        .mockResolvedValueOnce({ code: 200, value: members[2] });

      const result = await service.conversationMessages(id.toString(), 5, 5);

      const messagesField = messages;
      messagesField[0].user = members[0];
      messagesField[1].user = members[0];
      messagesField[2].user = members[1];
      messagesField[3].user = members[2];
      messagesField[4].user = members[2];

      expect(result).toEqual({
        code: 200,
        message: '',
        value: {
          messages: messagesField,
          pageAvailable: 2,
          moreAvailable: false,
        },
      });
      done();
    });
  });

  describe('findAllWithPopulate', () => {
    it('should call find with correct arg', async (done) => {
      const memberId = Types.ObjectId();

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      const populate2 = jest.fn().mockReturnValue({ select });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      mockConversation.find = jest
        .fn()
        .mockReturnValue({ populate: populate1 });

      await service.findAllWithPopulate(memberId.toString(), true);

      expect(mockConversation.find).toBeCalled();
      expect(mockConversation.find).toBeCalledWith({
        members: { $in: [Types.ObjectId(memberId.toString())] },
      });

      expect(populate1).toBeCalled();
      expect(populate1).toBeCalledWith(
        'last_message.user',
        'email username _id profilPic isOnline',
      );

      expect(populate2).toBeCalled();
      expect(populate2).toBeCalledWith(
        'members',
        'email username _id profilPic isOnline',
      );

      expect(select).toBeCalled();
      expect(select).toBeCalledWith('-messages');

      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);
      done();
    });

    it("should return {code:500, message:'ErrorMessage', value:[]}", async (done) => {
      const memberId = Types.ObjectId();

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      const populate2 = jest.fn().mockReturnValue({ select });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      mockConversation.find = jest
        .fn()
        .mockReturnValue({ populate: populate1 });

      const result = await service.findAllWithPopulate(
        memberId.toString(),
        true,
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: [],
      });
      done();
    });

    it("should return {code:200, message:'', value:[2xConversaion]} with populate members and last message user", async (done) => {
      const memberId = Types.ObjectId();

      const conversations = [
        {
          members: [
            {
              email: 'test@test.com',
              username: 'test',
              _id: memberId,
              profilPic: 'test.png',
              isOnline: false,
            },
            {
              email: 'test2@test.com',
              username: 'test2',
              _id: Types.ObjectId(),
              profilPic: 'test2.png',
              isOnline: false,
            },
          ],
          last_message: {
            user: {
              email: 'test@test.com',
              username: 'test',
              _id: memberId,
              profilPic: 'test.png',
              isOnline: false,
            },
            date: new Date(),
            message: 'Hello',
            medias: [],
          },
        },
      ];

      const lean = jest.fn().mockResolvedValue(conversations);
      const select = jest.fn().mockReturnValue({ lean });
      const populate2 = jest.fn().mockReturnValue({ select });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      mockConversation.find = jest
        .fn()
        .mockReturnValue({ populate: populate1 });

      const result = await service.findAllWithPopulate(
        memberId.toString(),
        true,
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: conversations,
      });
      done();
    });
  });

  describe('get', () => {
    it('should use findOne with correct arg', async (done) => {
      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      const conversation = {
        _id: Types.ObjectId(),
      };

      const lean = jest.fn().mockResolvedValue(conversation);
      const select = jest.fn().mockReturnValue({ lean });
      mockConversation.findOne = jest.fn().mockReturnValue({ select });

      await service.get(toMemberId.toString(), memberId.toString());

      expect(mockConversation.findOne).toBeCalled();
      expect(mockConversation.findOne).toBeCalledWith({
        members: {
          $all: [
            Types.ObjectId(toMemberId.toString()),
            Types.ObjectId(memberId.toString()),
          ],
        },
      });

      expect(select).toBeCalled();
      expect(select).toBeCalledWith('_id');

      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);
      done();
    });

    it("should return {code:200, message:'', value:Conversation} because conversation with this arg exist", async (done) => {
      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      const conversation = {
        _id: Types.ObjectId(),
      };

      const lean = jest.fn().mockResolvedValue(conversation);
      const select = jest.fn().mockReturnValue({ lean });
      mockConversation.findOne = jest.fn().mockReturnValue({ select });

      const result = await service.get(
        toMemberId.toString(),
        memberId.toString(),
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: conversation,
      });
      done();
    });

    it("should return {code:500, message:'ErrorMessage', value:null} because findOne throw Error", async (done) => {
      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      mockConversation.findOne = jest.fn().mockReturnValue({ select });

      const result = await service.get(
        toMemberId.toString(),
        memberId.toString(),
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('addMessage', () => {
    it("should return {code:500, message:'ErrorMessage', value:null} because findOne throw Error", async (done) => {
      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      const input: ConversationSendMessageInput = {
        memberId: memberId.toString(),
        message: 'Salut',
        medias: [],
      };

      const conversation = {
        _id: Types.ObjectId(),
      };

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      mockConversation.findOne = jest.fn().mockReturnValue({ select });

      const result = await service.addMessage(toMemberId.toString(), input, []);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });

    it("should return {code:200, message:'', value:Conversation} because conversation exist and add new message", async (done) => {
      MockDate.set(new Date());

      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      const input: ConversationSendMessageInput = {
        memberId: memberId.toString(),
        message: 'Salut',
        medias: [],
      };

      const conversation = {
        _id: Types.ObjectId(),
      };

      const lean = jest.fn().mockResolvedValue(conversation);
      const select = jest.fn().mockReturnValue({ lean });
      mockConversation.findOne = jest.fn().mockReturnValue({ select });

      mockConversation.updateOne = jest.fn().mockResolvedValue({});

      const leanFindById = jest.fn().mockResolvedValue(conversation);
      const populate2 = jest.fn().mockReturnValue({ lean: leanFindById });
      const populate1 = jest.fn().mockReturnValue({ populate: populate2 });
      mockConversation.findById = jest
        .fn()
        .mockReturnValue({ populate: populate1 });

      const result = await service.addMessage(toMemberId.toString(), input, []);

      expect(result).toEqual({
        code: 200,
        message: '',
        value: conversation,
      });

      expect(mockConversation.findOne).toBeCalled();
      expect(mockConversation.findOne).toHaveBeenCalledWith({
        members: {
          $all: [
            Types.ObjectId(toMemberId.toString()),
            Types.ObjectId(memberId.toString()),
          ],
        },
      });
      expect(select).toBeCalled();
      expect(select).toBeCalledWith('_id');
      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);

      const messageItem = {
        date: new Date(),
        message: input.message,
        medias: [],
        user: Types.ObjectId(toMemberId.toString()),
      };

      expect(mockConversation.updateOne).toBeCalled();
      expect(mockConversation.updateOne).toBeCalledWith(
        { _id: Types.ObjectId(conversation._id.toString()) },
        { $push: { messages: messageItem }, last_message: messageItem },
      );

      expect(mockConversation.findById).toBeCalled();
      expect(mockConversation.findById).toBeCalledWith(
        Types.ObjectId(conversation._id.toString()),
      );
      expect(populate1).toBeCalled();
      expect(populate1).toBeCalledWith(
        'last_message.user',
        'email username _id profilPic isOnline',
      );
      expect(populate2).toBeCalled();
      expect(populate2).toBeCalledWith(
        'members',
        'email username _id profilPic isOnline',
      );
      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);

      done();
    });
  });

  describe('create', () => {
    it("should return {code:200, message:'', value:ConversationCreated} and populate members", async (done) => {
      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      const execPopulate = jest.fn().mockResolvedValue({});
      const conversation = {
        _id: Types.ObjectId(),
        members: [toMemberId, memberId],
        messages: [],
        last_message: null,
        populate: jest.fn().mockReturnValue({ execPopulate }),
      };

      mockConversation.create = jest.fn().mockResolvedValue(conversation);

      const result = await service.create(
        toMemberId.toString(),
        memberId.toString(),
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: conversation,
      });

      expect(mockConversation.create).toBeCalled();
      expect(mockConversation.create).toBeCalledWith({
        members: [
          Types.ObjectId(toMemberId.toString()),
          Types.ObjectId(memberId.toString()),
        ],
        messages: [],
        last_message: null,
      });

      expect(conversation.populate).toBeCalled();
      expect(conversation.populate).toBeCalledWith(
        'members',
        'email username _id profilPic isOnline',
      );

      expect(execPopulate).toBeCalled();
      done();
    });

    it("should return {code:500, message:'ErrorMessage', value:null} because create throw new Error", async (done) => {
      const toMemberId = Types.ObjectId();
      const memberId = Types.ObjectId();

      mockConversation.create = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.create(
        toMemberId.toString(),
        memberId.toString(),
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });
});
