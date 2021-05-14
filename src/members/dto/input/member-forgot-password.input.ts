import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class MemberForgotPasswordInput {
  @Field(() => String)
  email: string;
}
