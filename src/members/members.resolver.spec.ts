import { Test, TestingModule } from '@nestjs/testing';
import { FileUpload } from 'graphql-upload';
import { Types } from 'mongoose';
import * as GraphqlFieldsList from 'graphql-fields-list';
import { ConfigService } from 'nestjs-config';
import { JWTTokenData } from '../types/JWTToken';
import { generateRandomToken } from '../helpers/random.helper';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { UploadingService } from '../uploading/uploading.service';
import { MemberConfirmMemberInput } from './dto/input/member-confirm.input';
import { MemberForgotPasswordInput } from './dto/input/member-forgot-password.input';
import { MemberLoginInput } from './dto/input/member-login.input';
import { MemberRegisterInput } from './dto/input/member-register.input';
import { MemberResetPasswordInput } from './dto/input/member-reset-password-input';
import { MembersUpdateProfilPicInput } from './dto/input/members-update-profil-pic-input';
import { MembersResolver } from './members.resolver';
import { MembersService } from './members.service';

jest.mock('graphql-fields-list');

describe('MembersResolver', () => {
  let resolver: MembersResolver;

  const mockMembersService = {
    register: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    confirmAccount: jest.fn(),
    login: jest.fn(),
    findOne: jest.fn(),
    generateNewTokenFromRefreshToken: jest.fn(),
    getMyInfo: jest.fn(),
    findAll: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMailService = {
    sendConfirmAccountMail: jest.fn(),
    sendForgotPasswordMail: jest.fn(),
    sendAccountConfirmedMail: jest.fn(),
  };

  const mockRedisService = {
    setUserSession: jest.fn(),
    updateTokenInUserSession: jest.fn(),
    getUsersConncted: jest.fn(),
  };

  const mockUploadingService = {
    uploadProfilPic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersResolver,
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
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

    resolver = module.get<MembersResolver>(MembersResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('memberRegister', () => {
    it('should use register from member service', async (done) => {
      mockMembersService.register = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMesssage',
        value: null,
      });

      const input: MemberRegisterInput = {
        username: 'Test1',
        email: 'test@test.com',
        password: '123',
      };

      await resolver.memberRegister(input);

      expect(mockMembersService.register).toBeCalled();
      expect(mockMembersService.register).toBeCalledWith(input);
      done();
    });

    it('should return {result:false, message:"ErrorMessage"} and not send email because register from service return 500 code', async (done) => {
      mockMembersService.register = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberRegisterInput = {
        username: 'Test1',
        email: 'test@test.com',
        password: '123',
      };

      const result = await resolver.memberRegister(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      expect(mockMailService.sendConfirmAccountMail).not.toBeCalled();
      done();
    });

    it('should return {result:true, message:""} and send email because register from service return 200 code', async (done) => {
      const token = generateRandomToken();
      mockMembersService.register = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          email: 'test@test.com',
          registration_information: {
            token,
          },
        },
      });

      const input: MemberRegisterInput = {
        username: 'Test1',
        email: 'test@test.com',
        password: '123',
      };

      const result = await resolver.memberRegister(input);

      expect(result).toEqual({
        result: true,
        message: '',
      });
      expect(mockMailService.sendConfirmAccountMail).toBeCalled();
      expect(mockMailService.sendConfirmAccountMail).toBeCalledWith(
        'test@test.com',
        token,
      );
      done();
    });
  });

  describe('memberForgotPassword', () => {
    it('should use forgotPassword from service', async (done) => {
      mockMembersService.forgotPassword = jest.fn().mockResolvedValue({
        code: 500,
        message: '',
        value: null,
      });

      const input: MemberForgotPasswordInput = {
        email: 'test@test.com',
      };

      await resolver.memberForgotPassword(input);

      expect(mockMembersService.forgotPassword).toBeCalled();
      expect(mockMembersService.forgotPassword).toBeCalledWith(input.email);
      done();
    });

    it('should return {result:false, message:"ErrorMessage"} and not send email because forgotPassword from service return 500 code', async (done) => {
      mockMembersService.forgotPassword = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberForgotPasswordInput = {
        email: 'test@test.com',
      };

      const result = await resolver.memberForgotPassword(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      expect(mockMailService.sendForgotPasswordMail).not.toBeCalled();
      done();
    });

    it('should return {result:true, message:""} and send email because forgotPassword from service return 200 code', async (done) => {
      mockMembersService.forgotPassword = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          email: 'test@test.com',
          forgot_password: {
            token: '123',
          },
        },
      });

      const input: MemberForgotPasswordInput = {
        email: 'test@test.com',
      };

      const result = await resolver.memberForgotPassword(input);

      expect(result).toEqual({
        result: true,
        message: '',
      });
      expect(mockMailService.sendForgotPasswordMail).toBeCalled();
      expect(mockMailService.sendForgotPasswordMail).toBeCalledWith(
        'test@test.com',
        '123',
      );
      done();
    });
  });

  describe('memberResetPassword', () => {
    it('should use reset password from service', async (done) => {
      mockMembersService.resetPassword = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberResetPasswordInput = {
        email: 'test@test.com',
        token: '123',
        newPassword: '456',
      };

      await resolver.memberResetPassword(input);

      expect(mockMembersService.resetPassword).toBeCalled();
      expect(mockMembersService.resetPassword).toBeCalledWith(
        input.email,
        input.token,
        input.newPassword,
      );
      done();
    });

    it('should return {result:false, message:"ErrorMessage} because reset password from service return 500 code', async (done) => {
      mockMembersService.resetPassword = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberResetPasswordInput = {
        email: 'test@test.com',
        token: '123',
        newPassword: '456',
      };

      const result = await resolver.memberResetPassword(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      done();
    });

    it('should return {result:false, message:"} because reset password from service return 200 code', async (done) => {
      mockMembersService.resetPassword = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: null,
      });

      const input: MemberResetPasswordInput = {
        email: 'test@test.com',
        token: '123',
        newPassword: '456',
      };

      const result = await resolver.memberResetPassword(input);

      expect(result).toEqual({
        result: true,
        message: '',
      });
      done();
    });
  });

  describe('memberConfirmAccount', () => {
    it('should use confirm account from service', async (done) => {
      mockMembersService.confirmAccount = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberConfirmMemberInput = {
        email: 'test@test.com',
        token: generateRandomToken(),
      };

      await resolver.memberConfirmAccount(input);

      expect(mockMembersService.confirmAccount).toBeCalled();
      expect(mockMembersService.confirmAccount).toBeCalledWith(
        input.email,
        input.token,
      );
      done();
    });

    it('should return {result:false, message:"ErrorMessage"} and not send email because confirm account from service return 500 code', async (done) => {
      mockMembersService.confirmAccount = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberConfirmMemberInput = {
        email: 'test@test.com',
        token: generateRandomToken(),
      };

      const result = await resolver.memberConfirmAccount(input);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      expect(mockMailService.sendAccountConfirmedMail).not.toBeCalled();
      done();
    });

    it('should return {result:true, message:""} and send email because confirm account from service return 200 code', async (done) => {
      mockMembersService.confirmAccount = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          email: 'test@test.com',
        },
      });

      const input: MemberConfirmMemberInput = {
        email: 'test@test.com',
        token: generateRandomToken(),
      };

      const result = await resolver.memberConfirmAccount(input);

      expect(result).toEqual({
        result: true,
        message: '',
      });
      expect(mockMailService.sendAccountConfirmedMail).toBeCalled();
      expect(mockMailService.sendAccountConfirmedMail).toBeCalledWith(
        'test@test.com',
      );
      done();
    });
  });

  describe('memberLogin', () => {
    it('should use login from service with correct args', async (done) => {
      mockMembersService.login = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberLoginInput = {
        id: 'Test1',
        password: '123',
      };

      const ctx = {};

      await resolver.memberLogin(input, ctx);

      expect(mockMembersService.login).toBeCalled();
      expect(mockMembersService.login).toBeCalledWith(input);
      done();
    });

    it('should return {result:false, message:"ErrorMessage", token:""} and not set cookie and set redis session because login from service return 500 code', async (done) => {
      mockMembersService.login = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const input: MemberLoginInput = {
        id: 'Test1',
        password: '123',
      };

      const ctx = {
        res: {
          cookie: jest.fn(),
        },
      };

      const result = await resolver.memberLogin(input, ctx);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        token: '',
      });
      expect(mockRedisService.setUserSession).not.toBeCalled();
      expect(ctx.res.cookie).not.toBeCalled();
      done();
    });

    it('should return {result:true, message:"", token:"123"} and generate refresh token in cookies and set redis session because login from service return 200 code', async (done) => {
      mockConfigService.get = jest.fn().mockReturnValue('RefreshToken');

      const loginValue = {
        token: '123',
        refreshToken: '456',
        member: {
          email: 'test@test.com',
          username: 'Test1',
          _id: Types.ObjectId(),
          profilPic: 'test.png',
        },
      };

      mockMembersService.login = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: loginValue,
      });

      const input: MemberLoginInput = {
        id: 'Test1',
        password: '123',
      };

      const ctx = {
        res: {
          cookie: jest.fn(),
        },
      };

      const result = await resolver.memberLogin(input, ctx);

      expect(result).toEqual({
        result: true,
        message: '',
        token: '123',
      });
      expect(mockRedisService.setUserSession).toBeCalled();
      expect(mockRedisService.setUserSession).toBeCalledWith(
        loginValue.member.username,
        {
          email: loginValue.member.email,
          username: loginValue.member.username,
          _id: loginValue.member._id.toString(),
          jwtToken: loginValue.token,
          refreshToken: loginValue.refreshToken,
          profilPic: loginValue.member.profilPic,
        },
      );
      expect(ctx.res.cookie).toBeCalled();
      expect(ctx.res.cookie).toBeCalledWith(
        'RefreshToken',
        loginValue.refreshToken,
        {
          maxAge: 14 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        },
      );
      done();
    });
  });

  describe('membersUpdateProfilPic', () => {
    it('should use findOne from service with correct args', async (done) => {
      mockMembersService.findOne = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const file1: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'test1.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const input: MembersUpdateProfilPicInput = {
        filesSelected: file1,
      };

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      await resolver.membersUpdateProfilPic(input, user);

      expect(mockMembersService.findOne).toBeCalled();
      expect(mockMembersService.findOne).toBeCalledWith(
        user._id,
        ['username'],
        true,
      );
      done();
    });

    it('should return {result:false, message:"ErrorMessage"} because findOne from service return 500 code', async (done) => {
      mockMembersService.findOne = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const file1: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'test1.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const input: MembersUpdateProfilPicInput = {
        filesSelected: file1,
      };

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      const result = await resolver.membersUpdateProfilPic(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      done();
    });

    it('should use upload profil pic from service with correct args because user exist', async (done) => {
      mockMembersService.findOne = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          username: 'Test1',
        },
      });

      mockUploadingService.uploadProfilPic = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
      });

      const file1: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'test1.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const input: MembersUpdateProfilPicInput = {
        filesSelected: file1,
      };

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      await resolver.membersUpdateProfilPic(input, user);

      expect(mockUploadingService.uploadProfilPic).toBeCalled();
      expect(mockUploadingService.uploadProfilPic).toBeCalledWith(
        user._id,
        file1,
        'Test1',
      );
      done();
    });

    it('should return {result:false, message:"ErrorMessage"} because upload profil pic from service return 500 code', async (done) => {
      mockMembersService.findOne = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          username: 'Test1',
        },
      });

      mockUploadingService.uploadProfilPic = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
      });

      const file1: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'test1.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const input: MembersUpdateProfilPicInput = {
        filesSelected: file1,
      };

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      const result = await resolver.membersUpdateProfilPic(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      done();
    });

    it('should return {result:true, message:""} because upload profil pic from service return 200 code', async (done) => {
      mockMembersService.findOne = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: {
          username: 'Test1',
        },
      });

      mockUploadingService.uploadProfilPic = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
      });

      const file1: Promise<FileUpload> = new Promise((resolve) => {
        resolve({
          filename: 'test1.png',
          mimetype: 'image/png',
          encoding: '',
          createReadStream: jest.fn(),
        });
      });

      const input: MembersUpdateProfilPicInput = {
        filesSelected: file1,
      };

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      const result = await resolver.membersUpdateProfilPic(input, user);

      expect(result).toEqual({
        result: true,
        message: '',
      });
      done();
    });
  });

  describe('memberRefreshToken', () => {
    it('should return {result:false, message:"Unable to find refresh token", newToken:null} because no refresh token in cookie', async (done) => {
      mockConfigService.get = jest.fn().mockReturnValue('RefreshToken');

      const ctx = {
        req: {
          cookies: {},
        },
      };

      const result = await resolver.memberRefreshToken(ctx);

      expect(result).toEqual({
        result: false,
        message: 'Unable to find refresh token',
        newToken: null,
      });
      done();
    });

    it('should return {result:false, message:"Unable to find token", newToken:null} because no token in authorization in headers', async (done) => {
      mockConfigService.get = jest.fn().mockReturnValue('RefreshToken');

      const ctx = {
        req: {
          cookies: {
            RefreshToken: 'Hello',
          },
          headers: {
            authorization: '',
          },
        },
      };

      const result = await resolver.memberRefreshToken(ctx);

      expect(result).toEqual({
        result: false,
        message: 'Unable to find token',
        newToken: null,
      });
      done();
    });

    it('should use generateNewTokenFromRefreshToken from service with correct args', async (done) => {
      mockConfigService.get = jest.fn().mockReturnValue('RefreshToken');

      mockMembersService.generateNewTokenFromRefreshToken = jest
        .fn()
        .mockResolvedValue({ code: 500, message: 'ErrorMessage', value: null });

      const ctx = {
        req: {
          cookies: {
            RefreshToken: 'Hello',
          },
          headers: {
            authorization: 'World',
          },
        },
      };

      await resolver.memberRefreshToken(ctx);

      expect(mockMembersService.generateNewTokenFromRefreshToken).toBeCalled();
      expect(
        mockMembersService.generateNewTokenFromRefreshToken,
      ).toBeCalledWith('World', 'Hello');
      done();
    });

    it('should return {result:false, message:"ErrorMessage", newToken:""} and not update redis session with new token because generate new token from service return 500 code', async (done) => {
      mockConfigService.get = jest.fn().mockReturnValue('RefreshToken');

      mockMembersService.generateNewTokenFromRefreshToken = jest
        .fn()
        .mockResolvedValue({ code: 500, message: 'ErrorMessage', value: null });

      const ctx = {
        req: {
          cookies: {
            RefreshToken: 'Hello',
          },
          headers: {
            authorization: 'World',
          },
        },
      };

      const result = await resolver.memberRefreshToken(ctx);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        newToken: '',
      });
      expect(mockRedisService.updateTokenInUserSession).not.toBeCalled();
      done();
    });

    it('should return {result:true, message:"", newToken:"MyNewToken"} and update redis session with new token because generate new token from service return 200 code', async (done) => {
      mockConfigService.get = jest.fn().mockReturnValue('RefreshToken');

      mockMembersService.generateNewTokenFromRefreshToken = jest
        .fn()
        .mockResolvedValue({
          code: 200,
          message: '',
          value: { username: 'Test1', newToken: 'MyNewToken' },
        });

      const ctx = {
        req: {
          cookies: {
            RefreshToken: 'Hello',
          },
          headers: {
            authorization: 'World',
          },
        },
      };

      const result = await resolver.memberRefreshToken(ctx);

      expect(result).toEqual({
        result: true,
        message: '',
        newToken: 'MyNewToken',
      });
      expect(mockMembersService.generateNewTokenFromRefreshToken).toBeCalled();
      expect(mockRedisService.updateTokenInUserSession).toBeCalledWith(
        'Test1',
        'MyNewToken',
      );
      done();
    });
  });

  describe('memberMyInformation', () => {
    it('should use get my info from service with correct args', async (done) => {
      mockMembersService.getMyInfo = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      const info = {};

      const spy = jest
        .spyOn(GraphqlFieldsList, 'fieldsList')
        .mockReturnValue(['username']);

      await resolver.memberMyInformation(user, info);

      expect(mockMembersService.getMyInfo).toBeCalled();
      expect(mockMembersService.getMyInfo).toBeCalledWith(
        user._id,
        ['username'],
        true,
      );
      expect(spy).toBeCalled();
      expect(spy).toBeCalledWith(info, { path: 'value' });
      done();
    });

    it('should return {result:false, message:"ErrorMessage", value:null} because get my info from service return 500 code', async (done) => {
      mockMembersService.getMyInfo = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      const info = {};

      const result = await resolver.memberMyInformation(user, info);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: null,
      });
      done();
    });

    it('should return {result:true, message:"", value:{username:"Test1"}} because get my info from service return 200 code', async (done) => {
      mockMembersService.getMyInfo = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: { username: 'Test1' },
      });

      const user: JWTTokenData = {
        email: 'test@test.com',
        username: 'Test1',
        profilPic: 'test.png',
        _id: Types.ObjectId().toString(),
      };

      const info = {};

      const result = await resolver.memberMyInformation(user, info);

      expect(result).toEqual({
        result: true,
        message: '',
        value: { username: 'Test1' },
      });
      done();
    });
  });

  describe('membersOnline', () => {
    it('should use getUsersConnected from service', async (done) => {
      mockRedisService.getUsersConncted = jest.fn().mockResolvedValue({});

      const result = await resolver.membersOnline();

      expect(mockRedisService.getUsersConncted).toBeCalled();
      done();
    });

    it('should return {result:false, message:"ErrorMessage", values:[]} because getUsersConnected return 500 code', async (done) => {
      mockRedisService.getUsersConncted = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: [],
      });

      const result = await resolver.membersOnline();

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        values: [],
      });
      done();
    });

    it('should return {result:true, message:"", values:[2xJWTTokenData]} because getUsersConnected return 200 code', async (done) => {
      const value: JWTTokenData[] = [
        {
          _id: Types.ObjectId().toString(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'test.png',
        },
        {
          _id: Types.ObjectId().toString(),
          username: 'Test2',
          email: 'test2@test.com',
          profilPic: 'test2.png',
        },
      ];

      mockRedisService.getUsersConncted = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: value,
      });

      const result = await resolver.membersOnline();

      expect(result).toEqual({
        result: true,
        message: '',
        values: value,
      });
      done();
    });
  });

  describe('membersInfo', () => {
    it('should use findAll from service with correct args', async (done) => {
      mockMembersService.findAll = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: null,
      });

      await resolver.membersInfo();

      expect(mockMembersService.findAll).toBeCalled();
      expect(mockMembersService.findAll).toBeCalledWith(
        ['_id', 'username', 'email', 'profilPic', 'isOnline'],
        true,
      );
      done();
    });

    it('should return {result:false, message:"ErrorMessage", members:[]} because findAll from service return 500 code', async (done) => {
      mockMembersService.findAll = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
        value: [],
      });

      const result = await resolver.membersInfo();

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        members: [],
      });
      done();
    });

    it('should return {result:true, message:"", members:[2xMember]} because findAll from service return 200 code', async (done) => {
      const members = [
        {
          _id: Types.ObjectId(),
          username: 'Test1',
          email: 'test@test.com',
          profilPic: 'test.png',
          isOnline: true,
        },
        {
          _id: Types.ObjectId(),
          username: 'Test2',
          email: 'test2@test.com',
          profilPic: 'test2.png',
          isOnline: false,
        },
      ];

      mockMembersService.findAll = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
        value: members,
      });

      const result = await resolver.membersInfo();

      expect(result).toEqual({
        result: true,
        message: '',
        members: members,
      });
      done();
    });
  });
});
