import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';

import { Member, MemberSchema } from './entities/member.entity';
import { MailModule } from '../mail/mail.module';
import { MembersService } from './members.service';
import { MembersResolver } from './members.resolver';
@Global()
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
    MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
    MailModule,
  ],
  providers: [MembersResolver, MembersService],
  exports: [MembersService],
})
export class MembersModule {}
