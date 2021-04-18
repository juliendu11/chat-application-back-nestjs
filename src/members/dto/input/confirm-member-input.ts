import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ConfirmMemberInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  token: string;
}
