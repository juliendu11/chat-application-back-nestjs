import { CreateDirectMessageInput } from './create-direct-message.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateDirectMessageInput extends PartialType(CreateDirectMessageInput) {
  @Field(() => Int)
  id: number;
}
