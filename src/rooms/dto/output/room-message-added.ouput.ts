import { Field, ObjectType } from '@nestjs/graphql';
import { Message } from '../../entities/sub/message.entity';

@ObjectType()
export class RoomMessageAddedOuput {
  @Field(() => Message)
  roomMessageAdded: Message;

  @Field(() => String)
  id: string;
}
