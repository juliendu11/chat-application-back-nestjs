import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';

@ObjectType()
export class MemberOnlineOutputUser {
  @Field(() => String)
  email: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  profilPic: string;

  @Field(() => String)
  _id: string;
}

@ObjectType()
export class MemberOnlineOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => [MemberOnlineOutputUser])
  values: MemberOnlineOutputUser[];
}
