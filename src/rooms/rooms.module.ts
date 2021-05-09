import { Module } from '@nestjs/common';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';
import { MongooseModule } from '@nestjs/mongoose';

import { RoomsService } from './rooms.service';
import { RoomsResolver } from './rooms.resolver';
import { Room, RoomSchema } from './entities/room.entity';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [
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
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
    MembersModule,
  ],
  providers: [RoomsResolver, RoomsService],
})
export class RoomsModule {}
