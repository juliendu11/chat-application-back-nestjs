import { MailerService } from '@nestjs-modules/mailer';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from 'nestjs-config';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { MailService } from './mail.service';
import * as FileHelper from '../helpers/file.helper';

jest.mock('../helpers/file.helper');

describe('MailService', () => {
  let service: MailService;

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: NestjsWinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValueOnce('no-reply@monsite.com')
              .mockReturnValueOnce('http://localhost/'),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendForgotPasswordMail', () => {
    it('should send mail with correct subject, email and text', async (done) => {
      jest.spyOn(FileHelper, 'checkExist').mockResolvedValue(true);
      jest
        .spyOn(FileHelper, 'readFile')
        .mockResolvedValueOnce('{{SUBJECT}} {{TEXT P}}<br>Hello world')
        .mockResolvedValueOnce('{{SUBJECT}} {{TEXT P}} Hello world');

      await service.sendForgotPasswordMail('test@test.com', 'ec6fer2ezrezrz');

      expect(mockMailerService.sendMail).toBeCalled();
      expect(mockMailerService.sendMail).toBeCalledWith({
        to: 'test@test.com',
        subject: 'Forgot password',
        text:
          'Forgot password You have requested a change of password.\n\nClick on this link to change your password:http://localhost/reset-password?email=test@test.com&token=ec6fer2ezrezrz Hello world',
        html:
          'Forgot password You have requested a change of password.<br><br>Click on this link to change your password:http://localhost/reset-password?email=test@test.com&token=ec6fer2ezrezrz<br>Hello world',
        from: 'no-reply@monsite.com',
      });

      done();
    });
  });

  describe('sendConfirmAccountMail', () => {
    it('should send mail with correct subject, email and text', async (done) => {
      jest.spyOn(FileHelper, 'checkExist').mockResolvedValue(true);
      jest
        .spyOn(FileHelper, 'readFile')
        .mockResolvedValueOnce('{{TEXT P}}<br>Hello world')
        .mockResolvedValueOnce('{{TEXT P}} Hello world');

      await service.sendConfirmAccountMail('test@test.com', 'ec6fer2ezrezrz');

      expect(mockMailerService.sendMail).toBeCalled();
      expect(mockMailerService.sendMail).toBeCalledWith({
        to: 'test@test.com',
        subject: 'Confirm your account',
        text:
          'To confirm your account click on this link:http://localhost/confirm?email=test@test.com&token=ec6fer2ezrezrz Hello world',
        html:
          'To confirm your account click on this link:http://localhost/confirm?email=test@test.com&token=ec6fer2ezrezrz<br>Hello world',
        from: 'no-reply@monsite.com',
      });

      done();
    });
  });

  describe('sendAccountConfirmedMail', () => {
    it('should send mail with correct subject, email and text', async (done) => {
      jest.spyOn(FileHelper, 'checkExist').mockResolvedValue(true);
      jest
        .spyOn(FileHelper, 'readFile')
        .mockResolvedValueOnce('{{TEXT P}}<br>Hello world')
        .mockResolvedValueOnce('{{TEXT P}} Hello world');

      await service.sendAccountConfirmedMail('test@test.com');

      expect(mockMailerService.sendMail).toBeCalled();
      expect(mockMailerService.sendMail).toBeCalledWith({
        to: 'test@test.com',
        subject: 'Account confirmed',
        text:
          'Congratulations your account is now confirmed, you can log in Hello world',
        html:
          'Congratulations your account is now confirmed, you can log in<br>Hello world',
        from: 'no-reply@monsite.com',
      });

      done();
    });
  });
});
