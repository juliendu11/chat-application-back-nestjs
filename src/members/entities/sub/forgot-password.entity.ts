import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@ObjectType()
@Schema()
export class ForgotPassword {
  @Field(() => String)
  @Prop()
  token: string;

  @Field(() => Date, { nullable: true })
  @Prop()
  expiration_date: Date;

  @Field(() => Date, { nullable: true })
  @Prop()
  date: Date;
}

export const ForgotPasswordSchema = SchemaFactory.createForClass(
  ForgotPassword,
);
