import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Message } from '../../../rooms/entities/sub/message.entity';

@ObjectType()
export class GetConversationMessageValue {
  @Field(() => Boolean)
  moreAvailable: boolean;

  @Field(() => Number)
  pageAvailable: number;

  @Field(() => [Message])
  messages: Message[];
}

@ObjectType()
export class GetConversationMessageOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => GetConversationMessageValue)
  value: GetConversationMessageValue;
}
