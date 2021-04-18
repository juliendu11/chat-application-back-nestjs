import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Room } from '../../entities/room.entity';

@ObjectType()
export class GetRoomsOuput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => [Room])
  value: Room[];
}
