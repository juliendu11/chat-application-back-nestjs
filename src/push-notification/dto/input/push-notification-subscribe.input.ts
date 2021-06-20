import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class PushNotificationSubscribeInput {
  @Field(() => String)
  endpoint: string;

  @Field(() => String)
  auth: string;

  @Field(() => String)
  p256dh: string;
}
