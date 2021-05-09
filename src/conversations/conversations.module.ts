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
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
        new transports.Console(),
      ],
    }),
  ],
  providers: [ConversationsResolver, ConversationsService],
})
export class ConversationsModule {}
