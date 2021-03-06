import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NestjsWinstonLoggerModule } from 'nestjs-winston-logger';
import { format, transports } from 'winston';

import { Member, MemberSchema } from './entities/member.entity';
import { MailModule } from '../mail/mail.module';
import { MembersService } from './members.service';
import { MembersResolver } from './members.resolver';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { UploadingModule } from '../uploading/uploading.module';
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
    MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
    MailModule,
    UploadingModule,
  ],
  providers: [MembersResolver, MembersService],
  exports: [MembersService],
})
export class MembersModule {}
