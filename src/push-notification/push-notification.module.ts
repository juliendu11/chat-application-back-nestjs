import { Module } from '@nestjs/common';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

import { PushNotificationService } from './push-notification.service';
import { PushNotificationResolver } from './push-notification.resolver';

@Module({
  imports: [
    NestjsWinstonLoggerModule.forRoot({
      format: format.combine(
        format.timestamp({ format: 'isoDateTime' }),
        format.json(),
        format.colorize({ all: true }),
      ),
      transports: [
        new transports.Console(),
        new DailyRotateFile({
          filename: '%DATE%.log',
          datePattern: 'DD-MM-YYYY',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          dirname: 'logs',
        }),
      ],
    }),
  ],
  providers: [PushNotificationResolver, PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
