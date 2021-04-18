import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class LoginMemberInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  password: string;
}
