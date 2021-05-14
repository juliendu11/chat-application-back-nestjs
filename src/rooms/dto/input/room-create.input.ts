import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RoomCreateInput {
  @Field(() => String)
  name: string;

  @Field(() => Boolean)
  isPrivate: boolean;
}
