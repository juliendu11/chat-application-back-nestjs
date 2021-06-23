import { Test, TestingModule } from '@nestjs/testing';
import * as webpush from 'web-push';
import { ConfigService } from 'nestjs-config';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { PushNotificationService } from './push-notification.service';
import { Member } from 'src/members/entities/member.entity';

jest.mock('web-push');

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  const mockConfigService = {
    get: jest
      .fn()
      .mockResolvedValueOnce('test@test.com')
      .mockResolvedValueOnce('myPublicKey')
      .mockResolvedValueOnce('myPrivateKey'),
  };

  const mockNestjsWinstonLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NestjsWinstonLoggerService,
          useValue: mockNestjsWinstonLoggerService,
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicKey', () => {
    it('should return {code:200, message:"", value:"myPublicKey"}', () => {
      mockConfigService.get = jest.fn().mockReturnValue('myPublicKey');

      const result = service.getPublicKey();
      expect(result).toEqual({
        code: 200,
        message: '',
        value: 'myPublicKey',
      });
    });
  });

  describe('sendNotificationSpecificSubscription', () => {
    it('should use send notification with correct args', async (done) => {
      const spy = jest.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 500,
        body: '',
        headers: {},
      });

      await service.sendNotificationSpecificSubscription(
        'endpoint',
        'auth',
        'p256dh',
        'Hello world',
      );

      expect(spy).toBeCalled();
      expect(spy).toBeCalledWith(
        {
          endpoint: 'endpoint',
          keys: {
            auth: 'auth',
            p256dh: 'p256dh',
          },
        },
        JSON.stringify({ text: 'Hello world' }),
      );
      done();
    });

    it('should return {code:200, message:""} because send notification with success', async (done) => {
      jest.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 200,
        body: '',
        headers: {},
      });

      const result = await service.sendNotificationSpecificSubscription(
        'endpoint',
        'auth',
        'p256dh',
        'Hello world',
      );

      expect(result).toEqual({
        code: 200,
        message: '',
      });
      done();
    });

    it('should return {code:400, message:"ErrorMessage"} because send notification with error (400 error)', async (done) => {
      jest.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 400,
        body: 'ErrorMessage',
        headers: {},
      });

      const result = await service.sendNotificationSpecificSubscription(
        'endpoint',
        'auth',
        'p256dh',
        'Hello world',
      );

      expect(result).toEqual({
        code: 400,
        message: 'ErrorMessage',
      });
      done();
    });

    it('should return {code:500, message:"ErrorMessage"} because send notification throw Error', async (done) => {
      jest
        .spyOn(webpush, 'sendNotification')
        .mockRejectedValue(new Error('ErrorMessage'));

      const result = await service.sendNotificationSpecificSubscription(
        'endpoint',
        'auth',
        'p256dh',
        'Hello world',
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
      });
      done();
    });
  });

  describe('sendNotification', () => {
    it('should use sendNotificationSpecificSubscription from service 2 times because member has 2 subscription item', async (done) => {
      service.sendNotificationSpecificSubscription = jest
        .fn()
        .mockResolvedValue({ code: 200, message: '' });

      const member = {
        email: 'test@test.com',
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
        ],
      };

      await service.sendNotification(
        (member as unknown) as Member,
        'Hello world!',
      );

      expect(service.sendNotificationSpecificSubscription).toBeCalledTimes(2);
      done();
    });

    it('should return {code:200, message:"", value:[1xDeadPushSubscription]} because member has 2 subscription item but one return error', async (done) => {
      service.sendNotificationSpecificSubscription = jest
        .fn()
        .mockResolvedValueOnce({ code: 500, message: '' })
        .mockResolvedValue({ code: 200, message: '' });

      const member = {
        email: 'test@test.com',
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
        ],
      };

      const result = await service.sendNotification(
        (member as unknown) as Member,
        'Hello world!',
      );

      expect(result).toEqual({
        code: 200,
        message: '',
        value: [
          {
            memberEmail: member.email,
            endpoint: member.push_subscriptions[0].endpoint,
            auth: member.push_subscriptions[0].auth,
            p256dh: member.push_subscriptions[0].p256dh,
          },
        ],
      });

      done();
    });

    it('should return {code:500, message:"ErrorMessage", value:[]} because sendNotificationSpecificSubscription throw Error', async (done) => {
      service.sendNotificationSpecificSubscription = jest
        .fn()
        .mockRejectedValue(new Error('ErrorMessage'));

      const member = {
        email: 'test@test.com',
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
        ],
      };

      const result = await service.sendNotification(
        (member as unknown) as Member,
        'Hello world!',
      );

      expect(result).toEqual({
        code: 500,
        message: 'ErrorMessage',
        value: [],
      });

      done();
    });
  });
});
