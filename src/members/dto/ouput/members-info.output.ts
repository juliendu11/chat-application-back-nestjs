import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Member } from '../../entities/member.entity';

@ObjectType()
export class MembersInfoOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => [Member])
  members: Member[];
}
