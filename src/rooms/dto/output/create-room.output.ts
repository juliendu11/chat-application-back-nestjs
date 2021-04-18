import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Room } from '../../entities/room.entity';

@ObjectType()
export class CreateRoomOutput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Room, { nullable: true })
  value: Room | null;
}
