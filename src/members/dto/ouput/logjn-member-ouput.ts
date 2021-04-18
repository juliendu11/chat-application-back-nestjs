import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';

@ObjectType()
export class LoginMemberOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => String)
  token: string;
}
