import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommonOutput {
  @Field(() => Boolean)
  result: boolean;

  @Field(() => String)
  message: string;
}
