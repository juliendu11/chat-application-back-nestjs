import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Member } from '../../../members/entities/member.entity';

@ObjectType()
export class MemberMyInformationOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Member)
  value: Member;
}
