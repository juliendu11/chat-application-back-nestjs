import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RoomAddMessageInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}
