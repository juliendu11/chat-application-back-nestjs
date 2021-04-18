import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

import {
  ForgotPassword,
  ForgotPasswordSchema,
} from './sub/forgot-password.entity';
import {
  RegistrationInformation,
  RegistrationInformationSchema,
} from './sub/registration-information.entity';

@ObjectType()
@Schema()
export class Member {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => String)
  @Prop({ required: true, unique: true })
  email: string;

  @Field(() => String)
  @Prop({ required: true, unique: true })
  username: string;

  @Field(() => String)
  @Prop({ required: true })
  password: string;

  @Field(() => RegistrationInformation)
  @Prop({
    type: RegistrationInformationSchema,
    default: new RegistrationInformation(),
  })
  registration_information: RegistrationInformation;

  @Field(() => ForgotPassword)
  @Prop({ type: ForgotPasswordSchema, default: new ForgotPassword() })
  forgot_password: ForgotPassword;

  @Field(() => Boolean)
  @Prop({ default: false })
  confirmed: boolean;
}
export type MemberDocument = Member & Document;

export const MemberSchema = SchemaFactory.createForClass(Member);
