import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@ObjectType()
@Schema({ _id: false, id: false })
export class ForgotPassword {
  @Field(() => String)
  @Prop()
  token: string;

  @Field(() => String, { nullable: true })
  @Prop()
  expiration_date: Date;

  @Field(() => String, { nullable: true })
  @Prop()
  date: Date;
}

export const ForgotPasswordSchema = SchemaFactory.createForClass(
  ForgotPassword,
);
