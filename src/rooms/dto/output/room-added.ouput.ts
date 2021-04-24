import { Field, ObjectType } from '@nestjs/graphql';
import { Room } from '../../entities/room.entity';

@ObjectType()
export class RoomAddedOutput {
  @Field(() => Room)
  roomAdded: Room;
}
