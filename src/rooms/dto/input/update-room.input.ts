import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateRoomInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => Date)
  date: Date;

  @Field(() => String)
  message: string;
}
