import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetRoomMessageInput {
  @Field(() => Number)
  skip: number;

  @Field(() => Number)
  limit: number;

  @Field(() => String)
  id: string;
}
