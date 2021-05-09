import { Field, ObjectType, OmitType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from 'src/interfaces/GraphqlResponse';
import { Conversation } from '../../entities/conversation.entity';

@ObjectType()
export class ConversationsOutputValue extends OmitType(Conversation, [
  'messages',
] as const) {}


@ObjectType()
export class ConversationsOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => [ConversationsOutputValue])
  value: ConversationsOutputValue[];
}
