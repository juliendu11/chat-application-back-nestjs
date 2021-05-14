import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class MemberConfirmMemberInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  token: string;
}
