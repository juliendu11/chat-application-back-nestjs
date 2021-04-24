import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@ObjectType()
@Schema()
export class RegistrationInformation {
  @Field(() => String)
  @Prop()
  token: string;

  @Field(() => String, { nullable: true })
  @Prop()
  date: Date;

  @Field(() => String, { nullable: true })
  @Prop()
  expiration_date: Date;
}

export const RegistrationInformationSchema = SchemaFactory.createForClass(
  RegistrationInformation,
);
