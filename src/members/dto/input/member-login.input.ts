import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class MemberLoginInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  password: string;
}
