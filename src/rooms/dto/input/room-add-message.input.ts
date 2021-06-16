import { InputType, Field } from '@nestjs/graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';

@InputType()
export class RoomAddMessageInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;

  @Field(() => [GraphQLUpload])
  medias: Promise<FileUpload>[];
}
