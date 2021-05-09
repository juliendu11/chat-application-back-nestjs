import { Module } from '@nestjs/common';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';

import { MailService } from './mail.service';

@Module({
  imports:[
    NestjsWinstonLoggerModule.forRoot({
      format: format.combine(
        format.timestamp({ format: 'isoDateTime' }),
        format.json(),
        format.colorize({ all: true }),
      ),
      transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
        new transports.Console(),
      ],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
