import { Module } from '@nestjs/common';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';
import { MongooseModule } from '@nestjs/mongoose';

import { RoomsService } from './rooms.service';
import { RoomsResolver } from './rooms.resolver';
import { Room, RoomSchema } from './entities/room.entity';
import { MembersModule } from '../members/members.module';
import * as DailyRotateFile from 'winston-daily-rotate-file';

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
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
    MembersModule,
  ],
  providers: [RoomsResolver, RoomsService],
})
export class RoomsModule {}
