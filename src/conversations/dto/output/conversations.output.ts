import { ObjectType, OmitType } from '@nestjs/graphql';
import { Conversation } from '../../entities/conversation.entity';

@ObjectType()
export class ConversationsOutput extends OmitType(Conversation, [
  'messages',
] as const) {}
