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
import { Member } from './entities/member.entity';
import { MembersService } from './members.service';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('MembersService', () => {
  let service: MembersService;

  const mockMember = {
    find: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockConfigService = {};

  const mockRedisService = {};

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

  describe('confirmAccount', () => {});
});
