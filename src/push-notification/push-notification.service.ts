import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nestjs-config';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import * as webpush from 'web-push';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { Member } from '../members/entities/member.entity';
import { getResult } from '../helpers/code.helper';
import { DeadPushSubscription } from '../types/DeadPushSubscription';

@Injectable()
export class PushNotificationService {
  constructor(
    private readonly configService: ConfigService,
    private logger: NestjsWinstonLoggerService,
  ) {
    webpush.setVapidDetails(
      `mailto:${this.configService.get('web-push.supportMail')}`,
      this.configService.get('web-push.publicKey'),
      this.configService.get('web-push.privateKey'),
    );
    logger.setContext(PushNotificationService.name);
  }

  getPublicKey(): ServiceResponseType<string> {
    this.logger.log(`>>>> [getPublicKey]`);

    const response = {
      code: 200,
      message: '',
      value: this.configService.get('web-push.publicKey'),
    };

    this.logger.log(
      `<<<< [getPublicKey] Response: ${JSON.stringify({ response })}`,
    );

    return response;
  }

  async sendNotificationSpecificSubscription(
    endpoint: string,
    auth: string,
    p256dh: string,
    text: string,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [sendNotificationSpecificSubscription] Use with ${JSON.stringify({
          endpoint,
          auth,
          p256dh,
        })}`,
      );

      const toSend = JSON.stringify({
        text,
      });

      const result = await webpush.sendNotification(
        {
          endpoint,
          keys: {
            auth,
            p256dh,
          },
        },
        toSend,
      );

      const response = {
        code: result.statusCode,
        message: result.body,
      };

      this.logger.log(
        `<<<< [sendNotificationSpecificSubscription] Response: ${JSON.stringify(
          { response },
        )}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `<<<< [sendNotificationSpecificSubscription] Exception`,
        error,
      );

      return {
        code: 500,
        message: error.message,
      };
    }
  }

  async sendNotification(
    member: Member,
    message: string,
  ): Promise<ServiceResponseType<DeadPushSubscription[]>> {
    try {
      this.logger.log(
        `>>>> [sendNotification] Use with ${JSON.stringify({
          email: member.email,
          message,
        })}`,
      );

      const deadPushSubcription: DeadPushSubscription[] = [];

      await Promise.all(
        member.push_subscriptions.map(async (subscription) => {
          const resultSendNotfication = await this.sendNotificationSpecificSubscription(
            subscription.endpoint,
            subscription.auth,
            subscription.p256dh,
            message,
          );
          if (!getResult(resultSendNotfication.code)) {
            deadPushSubcription.push({
              memberEmail: member.email,
              endpoint: subscription.endpoint,
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            });
          }
        }),
      );

      const response = {
        code: 200,
        message: '',
        value: deadPushSubcription,
      };

      this.logger.log(
        `<<<< [sendNotification] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [sendNotification] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: [],
      };
    }
  }
}
