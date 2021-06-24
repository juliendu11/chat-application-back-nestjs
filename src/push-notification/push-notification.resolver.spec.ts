import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JWTTokenData } from 'src/types/JWTToken';
import { MembersService } from '../members/members.service';
import { PushNotificationSubscribeInput } from './dto/input/push-notification-subscribe.input';
import { PushNotificationResolver } from './push-notification.resolver';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationResolver', () => {
  let resolver: PushNotificationResolver;

  const mockPushNotificationService = {
    getPublicKey: jest.fn(),
    sendNotificationSpecificSubscription: jest.fn(),
  };

  const mockMembersService = {
    addPushSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationResolver,
        {
          provide: PushNotificationService,
          useValue: mockPushNotificationService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
      ],
    }).compile();

    resolver = module.get<PushNotificationResolver>(PushNotificationResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('pushNotificationPublicKey', () => {
    it('should use getPublicKey from service', () => {
      mockPushNotificationService.getPublicKey = jest.fn().mockReturnValue({
        code: 500,
        message: 'ErrorMessage',
        value: '',
      });

      resolver.pushNotificationPublicKey();

      expect(mockPushNotificationService.getPublicKey).toBeCalled();
    });

    it('should return {result:false, message:"ErrorMessage", value:""} because public key from service return 500 code', () => {
      mockPushNotificationService.getPublicKey = jest.fn().mockReturnValue({
        code: 500,
        message: 'ErrorMessage',
        value: '',
      });

      const result = resolver.pushNotificationPublicKey();

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
        value: '',
      });
    });

    it('should return {result:true, message:"", value:"TestKey"} because public key from service return 200 code', () => {
      mockPushNotificationService.getPublicKey = jest.fn().mockReturnValue({
        code: 200,
        message: '',
        value: 'TestKey',
      });

      const result = resolver.pushNotificationPublicKey();

      expect(result).toEqual({
        result: true,
        message: '',
        value: 'TestKey',
      });
    });
  });

  describe('pushNotificationSubscribe', () => {
    it('should use addPushSubscription from member service with correct args', async (done) => {
      mockMembersService.addPushSubscription = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
      });

      const input: PushNotificationSubscribeInput = {
        endpoint: 'endpoint01',
        auth: 'auth01',
        p256dh: 'p256dh01',
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        username: 'Test1',
        email: 'test1@test.com',
        profilPic: 'test.png',
      };

      await resolver.pushNotificationSubscribe(input, user);

      expect(mockMembersService.addPushSubscription).toBeCalled();
      expect(mockMembersService.addPushSubscription).toBeCalledWith(
        user._id,
        input.endpoint,
        input.auth,
        input.p256dh,
      );
      done();
    });

    it('should return {result:false, message:"ErrorMessage"} and not send push notification because addPushSubscription from member service return 500 code', async (done) => {
      mockMembersService.addPushSubscription = jest.fn().mockResolvedValue({
        code: 500,
        message: 'ErrorMessage',
      });

      mockPushNotificationService.sendNotificationSpecificSubscription = jest
        .fn()
        .mockResolvedValue({});

      const input: PushNotificationSubscribeInput = {
        endpoint: 'endpoint01',
        auth: 'auth01',
        p256dh: 'p256dh01',
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        username: 'Test1',
        email: 'test1@test.com',
        profilPic: 'test.png',
      };

      const result = await resolver.pushNotificationSubscribe(input, user);

      expect(result).toEqual({
        result: false,
        message: 'ErrorMessage',
      });
      expect(
        mockPushNotificationService.sendNotificationSpecificSubscription,
      ).not.toBeCalled();
      done();
    });

    it('should return {result:true, message:""} and send push notification because addPushSubscription from member service return 200 code', async (done) => {
      mockMembersService.addPushSubscription = jest.fn().mockResolvedValue({
        code: 200,
        message: '',
      });

      mockPushNotificationService.sendNotificationSpecificSubscription = jest
        .fn()
        .mockResolvedValue({});

      const input: PushNotificationSubscribeInput = {
        endpoint: 'endpoint01',
        auth: 'auth01',
        p256dh: 'p256dh01',
      };

      const user: JWTTokenData = {
        _id: Types.ObjectId().toString(),
        username: 'Test1',
        email: 'test1@test.com',
        profilPic: 'test.png',
      };

      const result = await resolver.pushNotificationSubscribe(input, user);

      expect(result).toEqual({
        result: true,
        message: '',
      });
      expect(
        mockPushNotificationService.sendNotificationSpecificSubscription,
      ).toBeCalled();
      expect(
        mockPushNotificationService.sendNotificationSpecificSubscription,
      ).toBeCalledWith(
        input.endpoint,
        input.auth,
        input.p256dh,
        'You are now subscribed to push notifications!',
      );
      done();
    });
  });
});
