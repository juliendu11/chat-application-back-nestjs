import { InputType, Field } from '@nestjs/graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';

@InputType()
export class MembersUpdateProfilPicInput {
  @Field(() => GraphQLUpload)
  filesSelected: Promise<FileUpload>;
}
