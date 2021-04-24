import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AddMessageInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}
