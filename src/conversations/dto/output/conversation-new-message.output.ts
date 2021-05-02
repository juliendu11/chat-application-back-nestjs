import { ObjectType, OmitType } from '@nestjs/graphql';
import { Conversation } from '../../entities/conversation.entity';

@ObjectType()
export class ConversationNewMessageOutput extends OmitType(Conversation, [
  'messages',
] as const) {}
