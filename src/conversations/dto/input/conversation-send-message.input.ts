import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ConversationSendMessageInput {
  @Field(() => String)
  memberId: string;

  @Field(() => String)
  message: string;
}
