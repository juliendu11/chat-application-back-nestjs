import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Room } from '../../rooms/entities/room.entity';

import {
  ForgotPassword,
  ForgotPasswordSchema,
} from './sub/forgot-password.entity';
import {
  RegistrationInformation,
  RegistrationInformationSchema,
} from './sub/registration-information.entity';
import {
  WebPushSubscription,
  WebPushSubscriptionSchema,
} from './sub/web-push-subscription.entity';

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

  @Field(() => String, { nullable: true })
  @Prop({ default: '' })
  profilPic: string;

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

  @Field(() => Boolean)
  @Prop({ default: false })
  isOnline: boolean;

  @Field(() => [Room])
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Room' }] })
  rooms: Types.ObjectId[] | Room[];

  @Field(() => [Conversation])
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Conversation' }] })
  conversations: Types.ObjectId[] | Conversation[];

  @Field(() => [WebPushSubscription])
  @Prop({ type: [WebPushSubscriptionSchema], default: [] })
  push_subscriptions: WebPushSubscription[];
}
export type MemberDocument = Member & Document;

export const MemberSchema = SchemaFactory.createForClass(Member);
