import { Module } from '@nestjs/common';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessagesResolver } from './direct-messages.resolver';
import { MongooseModule } from '@nestjs/mongoose';

import {
  DirectMessage,
  DirectMessageSchema,
} from './entities/direct-message.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DirectMessage.name, schema: DirectMessageSchema },
    ]),
  ],
  providers: [DirectMessagesResolver, DirectMessagesService],
})
export class DirectMessagesModule {}
