import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RoomGetInput {
  @Field(() => String)
  id: string;
}
