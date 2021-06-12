import { InputType, Field } from '@nestjs/graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
@InputType()
export class ConversationSendMessageInput {
  @Field(() => String)
  memberId: string;

  @Field(() => String)
  message: string;

  @Field(() => GraphQLUpload)
  media: Promise<FileUpload>;
}
