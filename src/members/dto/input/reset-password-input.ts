import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ResetPasswordInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  token: string;

  @Field(() => String)
  newPassword: string;
}
