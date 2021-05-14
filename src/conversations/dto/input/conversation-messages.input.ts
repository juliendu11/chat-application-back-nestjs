import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ConversationMessageInput {
  @Field(() => Number)
  skip: number;

  @Field(() => Number)
  limit: number;

  @Field(() => String)
  id: string;
}
