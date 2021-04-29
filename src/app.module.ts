import { MiddlewareConsumer, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from 'nestjs-config';
import { MailerModule } from '@nestjs-modules/mailer';
import { resolve, join } from 'path';
import { graphqlUploadExpress } from 'graphql-upload';

import { GraphqlQLFactory } from './factories/graphql-factory';
import { MongooseFactory } from './factories/mongoose-factory';

import { MailModule } from './mail/mail.module';
import { MembersModule } from './members/members.module';
import { MailerFactory } from './factories/mail-factory';
import { DirectMessagesModule } from './direct-messages/direct-messages.module';
import { RoomsModule } from './rooms/rooms.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';

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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    MembersModule,
    MailModule,
    DirectMessagesModule,
    RoomsModule,
    RedisModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(graphqlUploadExpress()).forRoutes('graphql');
  }
}
