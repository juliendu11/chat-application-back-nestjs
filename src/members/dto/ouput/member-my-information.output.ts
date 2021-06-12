import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from 'src/interfaces/GraphqlResponse';
import { Member } from 'src/members/entities/member.entity';

@ObjectType()
export class MemberMyInformationOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Member)
  value: Member;
}
