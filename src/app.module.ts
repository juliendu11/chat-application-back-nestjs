import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from 'nestjs-config';
import { MailerModule } from '@nestjs-modules/mailer';
import { resolve } from 'path';

import { GraphqlQLFactory } from './factories/graphql-factory';
import { MongooseFactory } from './factories/mongoose-factory';

import { MailModule } from './mail/mail.module';
import { MembersModule } from './members/members.module';
import { MailerFactory } from './factories/mail-factory';
import { DirectMessagesModule } from './direct-messages/direct-messages.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
    GraphQLModule.forRootAsync({
      useClass: GraphqlQLFactory,
    }),
    MongooseModule.forRootAsync({
      useClass: MongooseFactory,
    }),
    MailerModule.forRootAsync({
      useClass: MailerFactory,
    }),
    MembersModule,
    MailModule,
    DirectMessagesModule,
    RoomsModule,
  ],
})
export class AppModule {}
