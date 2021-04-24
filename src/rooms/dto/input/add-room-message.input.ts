import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AddRoomMessageInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}
