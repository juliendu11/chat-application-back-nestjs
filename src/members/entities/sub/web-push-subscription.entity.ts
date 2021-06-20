import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@ObjectType()
@Schema({ _id: false, id: false })
export class WebPushSubscription {
  @Field(() => String)
  @Prop()
  endpoint: string;

  @Field(() => String)
  @Prop()
  auth: string;

  @Field(() => String)
  @Prop()
  p256dh: string;
}

export const WebPushSubscriptionSchema = SchemaFactory.createForClass(
  WebPushSubscription,
);
