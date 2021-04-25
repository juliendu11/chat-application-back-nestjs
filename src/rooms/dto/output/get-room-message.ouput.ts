import { Field, ObjectType } from '@nestjs/graphql';
import { GraphqlQLResponseType } from '../../../interfaces/GraphqlResponse';
import { Room } from '../../entities/room.entity';
import { Message } from '../../entities/sub/message.entity';

@ObjectType()
export class GetRoomMessageValue {
  @Field(() => Boolean)
  moreAvailable: boolean;

  @Field(() => Number)
  pageAvailable: number;

  @Field(() => [Message])
  messages: Message[];
}

@ObjectType()
export class GetRoomMessageOuput implements GraphqlQLResponseType {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;

  @Field(() => Room)
  value: Room;
}
