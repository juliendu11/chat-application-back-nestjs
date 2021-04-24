import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Room } from '../../entities/room.entity';
import { Message } from '../../entities/sub/message.entity';

@ObjectType()
export class AddRoomMessageOuput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Message, { nullable: true })
  value: Message | null;
}
