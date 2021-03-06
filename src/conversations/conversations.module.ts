import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsResolver } from './conversations.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';

import {
  Conversation,
  ConversationSchema,
} from './entities/conversation.entity';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { UploadingModule } from '../uploading/uploading.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
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
    UploadingModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [ConversationsResolver, ConversationsService],
})
export class ConversationsModule {}
