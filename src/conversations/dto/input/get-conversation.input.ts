import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetConversationInput {
  @Field(() => Number)
  skip: number;

  @Field(() => Number)
  limit: number;

  @Field(() => String)
  id: string;
}
