import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommonOutput } from '../common/CommonOutput';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { getResult } from '../helpers/code.helper';
import { MembersService } from '../members/members.service';
import { JWTTokenData } from '../types/JWTToken';
import { PushNotificationSubscribeInput } from './dto/input/push-notification-subscribe.input';
import { PushNotificationPublicKey } from './dto/output/push-notification-public-key.output';
import { PushNotificationService } from './push-notification.service';

@Resolver()
export class PushNotificationResolver {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly memberService: MembersService,
  ) {}

  @Query(() => PushNotificationPublicKey)
  pushNotificationPublicKey(): PushNotificationPublicKey {
    const {
      code,
      message,
      value,
    } = this.pushNotificationService.getPublicKey();

    return {
      result: getResult(code),
      message,
      value,
    };
  }

  @Mutation(() => CommonOutput)
  @UseGuards(GqlAuthGuard)
  async pushNotificationSubscribe(
    @Args('pushNotificationSubscribeInput')
    pushNotificationSubscribeInput: PushNotificationSubscribeInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<CommonOutput> {
    const { code, message } = await this.memberService.addPushSubscription(
      user._id,
      pushNotificationSubscribeInput.endpoint,
      pushNotificationSubscribeInput.auth,
      pushNotificationSubscribeInput.p256dh,
    );

    const result = getResult(code);
    if (result) {
      await this.pushNotificationService.sendNotificationSpecificSubscription(
        pushNotificationSubscribeInput.endpoint,
        pushNotificationSubscribeInput.auth,
        pushNotificationSubscribeInput.p256dh,
        'You are now subscribed to push notifications!',
      );
    }

    return {
      result,
      message,
    };
  }
}
