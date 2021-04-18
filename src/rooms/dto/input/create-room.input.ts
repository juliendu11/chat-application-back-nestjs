import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateRoomInput {
  @Field(() => String)
  name: string;
}
