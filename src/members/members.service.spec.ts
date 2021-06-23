import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import { Types } from 'mongoose';
import { ConfigService } from 'nestjs-config';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import * as MockDate from 'mockdate';
import { RedisService } from '../redis/redis.service';
import { MemberLoginInput } from './dto/input/member-login.input';
import { MemberRegisterInput } from './dto/input/member-register.input';
import { Member, MemberDocument } from './entities/member.entity';
import { MembersService } from './members.service';
import { generateRandomToken } from '../helpers/random.helper';
import { DeadPushSubscription } from 'src/types/DeadPushSubscription';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('MembersService', () => {
  let service: MembersService;
  let configService: ConfigService;

  const mockMember = {
    find: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockRedisService = {
    getUserSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: getModelToken(Member.name),
          useValue: mockMember,
        },
        {
          provide: NestjsWinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValueOnce('3')
              .mockReturnValueOnce('tokenKey')
              .mockReturnValueOnce('2')
              .mockReturnValueOnce('refreshTokenKey'),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should use find with correct args', async (done) => {
      const member = [
        {
          email: 'test@test.com',
          username: 'test',
        },
      ];

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.find = jest.fn().mockReturnValue({ select });

      await service.findAll(['username', 'email'], true);

      expect(mockMember.find).toBeCalled();
      expect(mockMember.find).toBeCalledWith({});

      expect(select).toBeCalled();
      expect(select).toBeCalledWith('username email');

      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);
      done();
    });

    it("should return {code:200, message:'', value:[MemberX2]}", async (done) => {
      const member = [
        {
          email: 'test@test.com',
          username: 'test',
        },
      ];

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.find = jest.fn().mockReturnValue({ select });

      const result = await service.findAll([], true);

      expect(result).toEqual({
        code: 200,
        message: '',
        value: member,
      });
      done();
    });

    it("should return {code:500, message:'ERROR', value:[]} because find throw Error", async (done) => {
      const lean = jest.fn().mockRejectedValue(new Error('ERROR'));
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.find = jest.fn().mockReturnValue({ select });

      const result = await service.findAll([], true);

      expect(result).toEqual({
        code: 500,
        message: 'ERROR',
        value: [],
      });
      done();
    });
  });

  describe('findOne', () => {
    it('should use findById with correct args', async (done) => {
      const id = Types.ObjectId();

      const lean = jest.fn().mockResolvedValue({});
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      await service.findOne(id.toString(), ['username', 'email'], true);

      expect(mockMember.findById).toBeCalled();
      expect(mockMember.findById).toBeCalledWith(id);

      expect(select).toBeCalled();
      expect(select).toBeCalledWith('username email');

      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);
      done();
    });

    it('should return {code:200, message:"", value:Member}', async (done) => {
      const id = Types.ObjectId();

      const member = {
        email: 'test@test.com',
        username: 'juliendu11',
      };

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.findOne(
        id.toString(),
        ['username', 'email'],
        true,
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: member,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because findById throw Error', async (done) => {
      const id = Types.ObjectId();

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.findOne(
        id.toString(),
        ['username', 'email'],
        true,
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('register', () => {
    it('should use exists and create with correct args', async (done) => {
      const input: MemberRegisterInput = {
        username: 'Test',
        email: 'test@test.com',
        password: '123',
      };

      mockMember.exists = jest.fn().mockResolvedValue(false);
      mockMember.create = jest.fn().mockResolvedValue({ ...input });

      await service.register(input);

      expect(mockMember.exists).toBeCalled();
      expect(mockMember.exists).toBeCalledWith({
        $or: [{ email: input.email }, { username: input.username }],
      });

      expect(mockMember.create).toBeCalled();
      expect(mockMember.create.mock.calls[0][0].email).toBe(input.email);
      expect(mockMember.create.mock.calls[0][0].password).not.toBe(
        input.password,
      );
      expect(mockMember.create.mock.calls[0][0].username).toBe(input.username);
      expect(mockMember.create.mock.calls[0][0].confirmed).toBe(false);
      expect(mockMember.create.mock.calls[0][0].profilPic).toBe(
        'uploads/pictures/Test.jpg',
      );
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because exists throw Error', async (done) => {
      const input: MemberRegisterInput = {
        username: 'Test',
        email: 'test@test.com',
        password: '123',
      };

      mockMember.exists = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.register(input);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });

    it('should return {code:400, message:"An account already exists with this email or username", value:null} because account with this username or email already exist', async (done) => {
      const input: MemberRegisterInput = {
        username: 'Test',
        email: 'test@test.com',
        password: '123',
      };

      mockMember.exists = jest.fn().mockResolvedValue(true);

      const result = await service.register(input);

      expect(result).toEqual({
        code: 400,
        message: 'An account already exists with this email or username',
        value: null,
      });
      done();
    });

    it('should return {code:200, message:"A confirmation email has been sent to you", value:CreateMember}', async (done) => {
      const input: MemberRegisterInput = {
        username: 'Test',
        email: 'test@test.com',
        password: '123',
      };

      mockMember.exists = jest.fn().mockResolvedValue(false);
      mockMember.create = jest.fn().mockResolvedValue(input);

      const result = await service.register(input);

      expect(result).toEqual({
        code: 200,
        message: 'A confirmation email has been sent to you',
        value: input,
      });
      done();
    });
  });

  describe('login', () => {
    it('should use findOne with correct args', async (done) => {
      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      const lean = jest.fn().mockResolvedValue(null);
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      await service.login(input);

      expect(mockMember.findOne).toBeCalled();
      expect(mockMember.findOne).toBeCalledWith({
        $or: [{ email: input.id }, { username: input.id }],
      });

      expect(lean).toBeCalled();

      done();
    });

    it('should return {code:401, message:"Bad information", value:null} because this member not exist', async (done) => {
      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      const lean = jest.fn().mockResolvedValue(null);
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      const result = await service.login(input);

      expect(result).toEqual({
        code: 401,
        message: 'Bad information',
        value: null,
      });
      done();
    });

    it('should return {code:401, message:"Bad information, bad password", value:null} because password not same', async (done) => {
      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      const lean = jest
        .fn()
        .mockResolvedValue({ username: 'test1', password: '456' });
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      const result = await service.login(input);

      expect(result).toEqual({
        code: 401,
        message: 'Bad information, bad password',
        value: null,
      });
      done();
    });

    it('should return {code:401, message:"Bad information, bad password", value:null} because password not same', async (done) => {
      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      const lean = jest
        .fn()
        .mockResolvedValue({ username: 'test1', password: '456' });
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      const result = await service.login(input);

      expect(result).toEqual({
        code: 401,
        message: 'Bad information, bad password',
        value: null,
      });
      done();
    });

    it('should return {code:401, message:"Your account is not confirmed", value:null} because account not confirmed', async (done) => {
      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const lean = jest.fn().mockResolvedValue({
        username: 'test1',
        password: '123',
        confirmed: false,
      });
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      const result = await service.login(input);

      expect(result).toEqual({
        code: 401,
        message: 'Your account is not confirmed',
        value: null,
      });
      done();
    });

    it('should return {code:200, message:"", value:{token, refreshToken, member}}', async (done) => {
      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      const member = {
        _id: Types.ObjectId(),
        username: 'test1',
        email: 'test@test.com',
        password: '123',
        confirmed: true,
        profilPic: 'test.png',
      };

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      let called = 0;
      jest.spyOn(jwt, 'sign').mockImplementation(() => {
        called++;
        if (called === 1) {
          return 'testToken';
        }
        return 'testRefreshtoken';
      });

      const lean = jest.fn().mockResolvedValue(member);
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      const result = await service.login(input);

      expect(result).toEqual({
        code: 200,
        message: '',
        value: {
          member,
          token: 'testToken',
          refreshToken: 'testRefreshtoken',
        },
      });
      done();
    });

    it('should use create token and refresh token with correct arg', async (done) => {
      MockDate.set(new Date());

      const input: MemberLoginInput = {
        id: 'test@test.com',
        password: '123',
      };

      const member = {
        _id: Types.ObjectId(),
        username: 'test1',
        email: 'test@test.com',
        password: '123',
        confirmed: true,
        profilPic: 'test.png',
      };

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      let called = 0;
      const spyCreateToken = jest.spyOn(jwt, 'sign').mockImplementation(() => {
        called++;
        if (called === 1) {
          return 'testToken';
        }
        return 'testRefreshtoken';
      });

      const lean = jest.fn().mockResolvedValue(member);
      mockMember.findOne = jest.fn().mockReturnValue({ lean });

      await service.login(input);

      const tokenData = {
        email: member.email,
        username: member.username,
        profilPic: member.profilPic,
        _id: member._id.toString(),
      };

      expect(spyCreateToken).toBeCalledTimes(2);
      expect(spyCreateToken.mock.calls[0][0]).toEqual({
        data: tokenData,
        iat: Math.floor(Date.now() / 1000) - 30,
      });
      expect(spyCreateToken.mock.calls[0][1]).toBe('tokenKey');
      expect(spyCreateToken.mock.calls[0][2]).toEqual({
        expiresIn: '3h',
        issuer: 'myApp.com',
        audience: 'myApp.com',
      });

      expect(spyCreateToken.mock.calls[1][0]).toEqual({
        data: { _id: member._id },
        iat: Math.floor(Date.now() / 1000) - 30,
      });
      expect(spyCreateToken.mock.calls[1][1]).toBe('refreshTokenKey');
      expect(spyCreateToken.mock.calls[1][2]).toEqual({
        expiresIn: '2w',
        issuer: 'myApp.com',
        audience: 'myApp.com',
      });
      done();
    });
  });

  describe('forgotPassword', () => {
    it('should use findOne with correct args', async (done) => {
      const select = jest.fn().mockResolvedValue(null);
      mockMember.findOne = jest.fn().mockReturnValue({ select });

      await service.forgotPassword('test@test.com');

      expect(mockMember.findOne).toBeCalled();
      expect(mockMember.findOne).toBeCalledWith({ email: 'test@test.com' });
      expect(select).toBeCalled();
      expect(select).toBeCalledWith('email forgot_password');
      done();
    });

    it('should return {code:401, message:"Bad information", value:null} because not member exist with this email', async (done) => {
      const select = jest.fn().mockResolvedValue(null);
      mockMember.findOne = jest.fn().mockReturnValue({ select });

      const result = await service.forgotPassword('test@test.com');

      expect(result).toEqual({
        code: 401,
        message: 'Bad information',
        value: null,
      });
      done();
    });

    it('should set member forgot_password field and save it', async (done) => {
      MockDate.set(new Date());

      const member = {
        forgot_password: {
          date: null,
          expiration_date: null,
          token: '',
        },
        save: jest.fn().mockResolvedValue({}),
      };

      const select = jest.fn().mockResolvedValue(member);
      mockMember.findOne = jest.fn().mockReturnValue({ select });

      await service.forgotPassword('test@test.com');

      const date = dayjs();

      expect(member.forgot_password.date).toBeDefined();
      expect(member.forgot_password.expiration_date).toEqual(
        date.add(1, 'days').toDate(),
      );
      expect(member.forgot_password.token).toBeDefined();

      expect(member.save).toBeCalled();
      done();
    });

    it('should return {code:200, message:"An email has been sent to you to change your password", value:MemberFound}', async (done) => {
      const member = {
        forgot_password: {
          date: null,
          expiration_date: null,
          token: '',
        },
        save: jest.fn().mockResolvedValue({}),
      };

      const select = jest.fn().mockResolvedValue(member);
      mockMember.findOne = jest.fn().mockReturnValue({ select });

      const result = await service.forgotPassword('test@test.com');

      expect(result).toEqual({
        code: 200,
        message: 'An email has been sent to you to change your password',
        value: member,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because findOne throw Error', async (done) => {
      const select = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      mockMember.findOne = jest.fn().mockReturnValue({ select });

      const result = await service.forgotPassword('test@test.com');

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('resetPassword', () => {
    it('should use findOne with correct args', async (done) => {
      mockMember.findOne = jest.fn().mockResolvedValue(null);

      await service.resetPassword('test@test.com', 'testToken', '123');

      expect(mockMember.findOne).toBeCalled();
      expect(mockMember.findOne).toBeCalledWith({
        email: 'test@test.com',
        'forgot_password.token': 'testToken',
      });
      done();
    });

    it('should return {code:401, message:"Bad information", value:null} because not member exist with this email and token', async (done) => {
      mockMember.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.resetPassword(
        'test@test.com',
        'testToken',
        '123',
      );

      expect(result).toEqual({
        code: 401,
        message: 'Bad information',
        value: null,
      });
      done();
    });

    it('should return {code:401, message:"The token has expired", value:null} because token date has expired', async (done) => {
      const member = {
        forgot_password: {
          token: 'testToken',
          expiration_date: dayjs().add(-10, 'day'),
        },
        password: '123',
        save: jest.fn().mockResolvedValue({}),
      };

      mockMember.findOne = jest.fn().mockResolvedValue(member);

      const result = await service.resetPassword(
        'test@test.com',
        'testToken',
        '123',
      );

      expect(result).toEqual({
        code: 401,
        message: 'The token has expired',
        value: null,
      });
      done();
    });

    it('should reset forgot_password token and update password in member and save', async (done) => {
      const member = {
        forgot_password: {
          token: 'testToken',
          expiration_date: dayjs().add(1, 'day'),
        },
        password: '123',
        save: jest.fn().mockResolvedValue({}),
      };

      mockMember.findOne = jest.fn().mockResolvedValue(member);

      await service.resetPassword('test@test.com', 'testToken', '456');

      expect(member.forgot_password.token).toBe('');
      expect(member.password).not.toBe('123');
      expect(member.save).toBeCalled();
      done();
    });

    it('should return {code:200, message:"Congratulations your password has been changed", value:null}', async (done) => {
      const member = {
        forgot_password: {
          token: 'testToken',
          expiration_date: dayjs().add(1, 'day'),
        },
        password: '123',
        save: jest.fn().mockResolvedValue({}),
      };

      mockMember.findOne = jest.fn().mockResolvedValue(member);

      const result = await service.resetPassword(
        'test@test.com',
        'testToken',
        '123',
      );

      expect(result).toEqual({
        code: 200,
        message: 'Congratulations your password has been changed',
        value: null,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because findOne throw Error', async (done) => {
      mockMember.findOne = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.resetPassword(
        'test@test.com',
        'testToken',
        '123',
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('confirmAccount', () => {
    it('should use findOne with correct args', async (done) => {
      mockMember.findOne = jest.fn().mockResolvedValue(null);

      const email = 'test@test.com';
      const token = generateRandomToken();

      await service.confirmAccount(email, token);

      expect(mockMember.findOne).toBeCalled();
      expect(mockMember.findOne).toBeCalledWith({
        email,
        'registration_information.token': token,
      });
      done();
    });

    it('should return {code:401, message:"Bad information", value:null} because not account with this email exist', async (done) => {
      mockMember.findOne = jest.fn().mockResolvedValue(null);

      const email = 'test@test.com';
      const token = generateRandomToken();

      const result = await service.confirmAccount(email, token);

      expect(result).toEqual({
        code: 401,
        message: 'Bad information',
        value: null,
      });
      done();
    });

    it('should return {code:401, message:"The token has expired", value:null} because token date has expired', async (done) => {
      const member = {
        registration_information: {
          expiration_date: dayjs().add(-5, 'day'),
        },
        confirmed: false,
      };

      mockMember.findOne = jest.fn().mockResolvedValue(member);

      const email = 'test@test.com';
      const token = generateRandomToken();

      const result = await service.confirmAccount(email, token);

      expect(result).toEqual({
        code: 401,
        message: 'The token has expired',
        value: null,
      });
      done();
    });

    it('should return {code:200, message:"Congratulations your account has been confirmed", value:Member}, delete registration token and set confirmed true and save', async (done) => {
      const member = {
        registration_information: {
          expiration_date: dayjs().add(5, 'day'),
        },
        confirmed: false,
        save: jest.fn().mockResolvedValue({}),
      };

      mockMember.findOne = jest.fn().mockResolvedValue(member);

      const email = 'test@test.com';
      const token = generateRandomToken();

      const result = await service.confirmAccount(email, token);

      expect(result).toEqual({
        code: 200,
        message: 'Congratulations your account has been confirmed',
        value: member,
      });
      expect(member.confirmed).toBe(true);
      expect(member.save).toBeCalled();
      done();
    });
  });

  describe('addRoomCreated', () => {
    it('should updateOne with correct args', async (done) => {
      const userId = Types.ObjectId().toString();
      const roomId = Types.ObjectId().toString();

      mockMember.updateOne = jest.fn().mockResolvedValue({});

      await service.addRoomCreated(userId, roomId);

      expect(mockMember.updateOne).toBeCalled();
      expect(mockMember.updateOne).toBeCalledWith(
        { _id: Types.ObjectId(userId) },
        { $push: { rooms: Types.ObjectId(roomId) } },
      );
      done();
    });

    it('should return {code:200, message:""}', async (done) => {
      const userId = Types.ObjectId().toString();
      const roomId = Types.ObjectId().toString();

      mockMember.updateOne = jest.fn().mockResolvedValue({});

      const result = await service.addRoomCreated(userId, roomId);

      expect(result).toEqual({
        code: 200,
        message: '',
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage"} because updateOne', async (done) => {
      const userId = Types.ObjectId().toString();
      const roomId = Types.ObjectId().toString();

      mockMember.updateOne = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.addRoomCreated(userId, roomId);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
      });
      done();
    });
  });

  describe('removeRoomCreated', () => {
    it('should use updateOne with correct args', async (done) => {
      const userId = Types.ObjectId().toString();
      const roomId = Types.ObjectId().toString();

      mockMember.updateOne = jest.fn().mockResolvedValue({});

      await service.removeRoomCreated(userId, roomId);

      expect(mockMember.updateOne).toBeCalled();
      expect(mockMember.updateOne).toBeCalledWith(
        { _id: Types.ObjectId(userId) },
        { $pull: { rooms: Types.ObjectId(roomId) } },
      );
      done();
    });

    it('should return {code:200, message:""}', async (done) => {
      const userId = Types.ObjectId().toString();
      const roomId = Types.ObjectId().toString();

      mockMember.updateOne = jest.fn().mockResolvedValue({});

      const result = await service.removeRoomCreated(userId, roomId);

      expect(result).toEqual({
        code: 200,
        message: '',
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage"}', async (done) => {
      const userId = Types.ObjectId().toString();
      const roomId = Types.ObjectId().toString();

      mockMember.updateOne = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.removeRoomCreated(userId, roomId);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
      });
      done();
    });
  });

  describe('getMyInfo', () => {
    it('should use findById with correct args', async (done) => {
      const id = Types.ObjectId().toString();

      const member = {
        username: 'Test1',
        email: 'test@test.com',
      };

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      await service.getMyInfo(id, ['username', 'email'], true);

      expect(mockMember.findById).toBeCalled();
      expect(mockMember.findById).toBeCalledWith(Types.ObjectId(id));

      expect(select).toBeCalled();
      expect(select).toBeCalledWith('username email');

      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(true);
      done();
    });

    it('should return {code:200, message:"", value:Member}', async (done) => {
      const id = Types.ObjectId().toString();

      const member = {
        username: 'Test1',
        email: 'test@test.com',
      };

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.getMyInfo(id, ['username', 'email'], true);

      expect(result).toEqual({
        code: 200,
        message: '',
        value: member,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null}', async (done) => {
      const id = Types.ObjectId().toString();

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.getMyInfo(id, ['username', 'email'], true);

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('generateNewTokenFromRefreshToken', () => {
    it("should return {code:403, message:'Token is invalid', value:null} because decode token return bad value", async (done) => {
      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest.spyOn(jwt, 'decode').mockReturnValue('');

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 403,
        message: 'Token is invalid',
        value: null,
      });

      done();
    });

    it("should return {code:403, message:'Refresh token is invalid', value:null} because verify refresh token return bad value", async (done) => {
      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest.spyOn(jwt, 'decode').mockReturnValue('Hello');
      jest.spyOn(jwt, 'verify').mockImplementation(() => '');

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 403,
        message: 'Refresh token is invalid',
        value: null,
      });

      done();
    });

    it("should return {code:403, message:'Error', value:null} because get user session return 400 error code", async (done) => {
      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue({ data: { username: 'Test1' } });
      jest.spyOn(jwt, 'verify').mockImplementation(() => 'Hello2');

      mockRedisService.getUserSession = jest.fn().mockResolvedValue({
        code: 400,
        message: 'Error',
        value: null,
      });

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 403,
        message: 'Error',
        value: null,
      });

      done();
    });

    it("should return {code:400, message:'Bad refresh token', value:null} because refresh token not corresponding with the one stored in redis", async (done) => {
      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue({ data: { username: 'Test1' } });
      jest.spyOn(jwt, 'verify').mockImplementation(() => 'Hello2');

      mockRedisService.getUserSession = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          refreshToken: 'aze',
          jwtToken: 'Hello2',
        },
      });

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 400,
        message: 'Bad refresh token',
        value: null,
      });

      done();
    });

    it("should return {code:400, message:'Bad token', value:null} because token not corresponding with the one stored in redis", async (done) => {
      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue({ data: { username: 'Test1' } });
      jest.spyOn(jwt, 'verify').mockImplementation(() => 'Hello2');

      mockRedisService.getUserSession = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          refreshToken: refreshToken.replace('Bearer ', ''),
          jwtToken: 'Hello2',
        },
      });

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 400,
        message: 'Bad token',
        value: null,
      });

      done();
    });

    it("should return {code:200, message:'', value:{newToken, username}} because all is ok", async (done) => {
      configService.get = jest
        .fn()
        .mockReturnValueOnce('refreshTokenKey')
        .mockReturnValueOnce('3')
        .mockReturnValueOnce('tokenKey')
        .mockReturnValueOnce('2')
        .mockReturnValueOnce('refreshTokenKey');

      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue({ data: { username: 'Test1' } });
      jest.spyOn(jwt, 'verify').mockImplementation(() => 'Hello2');

      const spyJwtSign = jest
        .spyOn(jwt, 'sign')
        .mockImplementation(() => 'New token');

      const getUserSessionValue = {
        refreshToken: refreshToken.replace('Bearer ', ''),
        jwtToken: oldToken.replace('Bearer ', ''),
        _id: Types.ObjectId().toString(),
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
      };

      mockRedisService.getUserSession = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: getUserSessionValue,
      });

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: {
          newToken: 'New token',
          username: 'Test1',
        },
      });

      const tokenData = {
        email: getUserSessionValue.email,
        username: getUserSessionValue.username,
        profilPic: getUserSessionValue.profilPic,
        _id: getUserSessionValue._id,
      };

      expect(spyJwtSign).toBeCalled();
      expect(spyJwtSign).toBeCalledWith(
        { data: tokenData, iat: Math.floor(Date.now() / 1000) - 30 },
        'tokenKey',
        {
          expiresIn: '3h',
          issuer: 'myApp.com',
          audience: 'myApp.com',
        },
      );
      done();
    });

    it("should return {code:500, message:'ErrorMessage', value:null} because getUserSession throw Error", async (done) => {
      const oldToken = 'Bearer ' + generateRandomToken();
      const refreshToken = 'Bearer ' + generateRandomToken();

      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue({ data: { username: 'Test1' } });
      jest.spyOn(jwt, 'verify').mockImplementation(() => 'Hello2');

      mockRedisService.getUserSession = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.generateNewTokenFromRefreshToken(
        oldToken,
        refreshToken,
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('addPushSubscription', () => {
    it('should use findById with correct args', async (done) => {
      const {
        memberId,
        endpoint,
        auth,
        p256dh,
      } = getMemberPushSubscriptionInformation();

      const lean = jest.fn().mockRejectedValue(new Error('ErrorMessage'));
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      await service.addPushSubscription(memberId, endpoint, auth, p256dh);

      expect(mockMember.findById).toBeCalled();
      expect(mockMember.findById).toBeCalledWith(Types.ObjectId(memberId));

      expect(select).toBeCalled();
      expect(select).toBeCalledWith('push_subscriptions');

      expect(lean).toBeCalled();
      expect(lean).toBeCalledWith(false);
      done();
    });

    it('should return {code:400, message:"Bad data", value:null} because findById throw Error', async (done) => {
      const {
        memberId,
        endpoint,
        auth,
        p256dh,
      } = getMemberPushSubscriptionInformation();

      const lean = jest.fn().mockRejectedValue(new Error('Error'));
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.addPushSubscription(
        memberId,
        endpoint,
        auth,
        p256dh,
      );

      expect(result).toEqual({
        code: 400,
        message: 'Bad data',
        value: null,
      });
      done();
    });

    it('should return {code:200, message:"This subscription already exist", value:null} because user has already this subscription in list', async (done) => {
      const {
        memberId,
        endpoint,
        auth,
        p256dh,
      } = getMemberPushSubscriptionInformation();

      const member = {
        push_subscriptions: [
          {
            endpoint,
            auth,
            p256dh,
          },
        ],
      };

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.addPushSubscription(
        memberId,
        endpoint,
        auth,
        p256dh,
      );

      expect(result).toEqual({
        code: 200,
        message: 'This subscription already exist',
        value: null,
      });
      done();
    });

    it('should return {code:200, message:"", value:null} and add new subscription in list and save because subscription not exist in list', async (done) => {
      const {
        memberId,
        endpoint,
        auth,
        p256dh,
      } = getMemberPushSubscriptionInformation();

      const member = {
        push_subscriptions: [],
        save: jest.fn(),
      };

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.addPushSubscription(
        memberId,
        endpoint,
        auth,
        p256dh,
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: null,
      });

      expect(member.save).toBeCalled();
      expect(member.push_subscriptions.length).toBe(1);
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because save throw Error', async (done) => {
      const {
        memberId,
        endpoint,
        auth,
        p256dh,
      } = getMemberPushSubscriptionInformation();

      const member = {
        push_subscriptions: [],
        save: jest.fn().mockRejectedValue(new Error('ErrorMessage')),
      };

      const lean = jest.fn().mockResolvedValue(member);
      const select = jest.fn().mockReturnValue({ lean });
      mockMember.findById = jest.fn().mockReturnValue({ select });

      const result = await service.addPushSubscription(
        memberId,
        endpoint,
        auth,
        p256dh,
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });
  });

  describe('deleteDeadPushSub', () => {
    it('should delete 2 subscription from member push_subscriptions list and save', async (done) => {
      const member = {
        save: jest.fn(),
        push_subscriptions: [
          {
            endpoint: 'endpoint1',
            auth: 'auth1',
            p256dh: 'p256dh1',
          },
          {
            endpoint: 'endpoint2',
            auth: 'auth2',
            p256dh: 'p256dh2',
          },
          {
            endpoint: 'endpoint3',
            auth: 'auth3',
            p256dh: 'p256dh3',
          },
        ],
      };

      const deadSubs: DeadPushSubscription[] = [
        {
          memberEmail: 'test@test.com',
          endpoint: member.push_subscriptions[0].endpoint,
          auth: member.push_subscriptions[0].auth,
          p256dh: member.push_subscriptions[0].p256dh,
        },
        {
          memberEmail: 'test@test.com',
          endpoint: member.push_subscriptions[2].endpoint,
          auth: member.push_subscriptions[2].auth,
          p256dh: member.push_subscriptions[2].p256dh,
        },
      ];

      await service.deleteDeadPushSub(
        (member as unknown) as MemberDocument,
        deadSubs,
      );

      expect(member.save).toBeCalled();
      expect(member.push_subscriptions.length).toBe(1);
      expect(member.push_subscriptions[0].endpoint).toBe('endpoint2');
      done();
    });

    it('should return {code:200, message:"", value:null}', async (done) => {
      const member = {
        save: jest.fn(),
        push_subscriptions: [
          {
            endpoint: 'endpoint1',
            auth: 'auth1',
            p256dh: 'p256dh1',
          },
          {
            endpoint: 'endpoint2',
            auth: 'auth2',
            p256dh: 'p256dh2',
          },
          {
            endpoint: 'endpoint3',
            auth: 'auth3',
            p256dh: 'p256dh3',
          },
        ],
      };

      const deadSubs: DeadPushSubscription[] = [
        {
          memberEmail: 'test@test.com',
          endpoint: member.push_subscriptions[0].endpoint,
          auth: member.push_subscriptions[0].auth,
          p256dh: member.push_subscriptions[0].p256dh,
        },
        {
          memberEmail: 'test@test.com',
          endpoint: member.push_subscriptions[2].endpoint,
          auth: member.push_subscriptions[2].auth,
          p256dh: member.push_subscriptions[2].p256dh,
        },
      ];

      const result = await service.deleteDeadPushSub(
        (member as unknown) as MemberDocument,
        deadSubs,
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: null,
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:null} because member.save throw Error', async (done) => {
      const member = {
        save: jest.fn().mockRejectedValue(new Error('ErrorMessage')),
        push_subscriptions: [
          {
            endpoint: 'endpoint1',
            auth: 'auth1',
            p256dh: 'p256dh1',
          },
          {
            endpoint: 'endpoint2',
            auth: 'auth2',
            p256dh: 'p256dh2',
          },
          {
            endpoint: 'endpoint3',
            auth: 'auth3',
            p256dh: 'p256dh3',
          },
        ],
      };

      const deadSubs: DeadPushSubscription[] = [
        {
          memberEmail: 'test@test.com',
          endpoint: member.push_subscriptions[0].endpoint,
          auth: member.push_subscriptions[0].auth,
          p256dh: member.push_subscriptions[0].p256dh,
        },
        {
          memberEmail: 'test@test.com',
          endpoint: member.push_subscriptions[2].endpoint,
          auth: member.push_subscriptions[2].auth,
          p256dh: member.push_subscriptions[2].p256dh,
        },
      ];

      const result = await service.deleteDeadPushSub(
        (member as unknown) as MemberDocument,
        deadSubs,
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

function getMemberPushSubscriptionInformation() {
  const memberId = Types.ObjectId().toString();
  const endpoint =
    'https://fcm.googleapis.com/fcm/send/f9aaetsU6js:APA91bEyKCkN4XtHuv2Zm6h08rHuSIroFubfbLDJEJXm3k4QEdVB3gfjth2H3lMkQUWF3CtAgH93Wn3MzvL78GcQphNG5R-5W_pk2ipCd3gFPNdMHqVHdH_fTMqwNjQVnMYhYMI2fLzD';
  const auth = 'DQFICVvUQwHHAq1QlRTsJw';
  const p256dh =
    'BPb9gK5uiaVWkaC87WPsnd63I1YYjbXjfUKsXu2HbaERTHm2Ylg2wDMuiZtP0PfdZJTLM8zC2zJ5Vz1hZ48aORU';
  return { memberId, endpoint, auth, p256dh };
}
