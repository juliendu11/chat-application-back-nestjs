import { Module } from '@nestjs/common';
import { EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { MemberDocument } from 'src/members/entities/member.entity';
import { getResult } from '../helpers/code.helper';
import { MembersService } from '../members/members.service';
import { PushNotificationModule } from '../push-notification/push-notification.module';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { RedisService } from '../redis/redis.service';

@Module({
  imports: [EventEmitterModule.forRoot(), PushNotificationModule],
})
export class MessageEventModule {
  constructor(
    private readonly memberService: MembersService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly redisService: RedisService,
  ) {}

  @OnEvent('added.pm')
  async handleAddedPMEvent(toMemberId: string, message: string) {
    const getMember = await this.memberService.findOne(
      toMemberId,
      ['push_subscriptions', 'username'],
      false,
    );
    if (!getResult(getMember.code) || !getMember.value) {
      return;
    }

    if (getMember.value.push_subscriptions.length === 0) {
      return;
    }

    const sendMessageToMember = await this.pushNotificationService.sendNotification(
      getMember.value,
      message,
    );

    if (!getResult(sendMessageToMember.code) || !sendMessageToMember.value) {
      return;
    }

    if (sendMessageToMember.value.length !== 0) {
      await this.memberService.deleteDeadPushSub(
        getMember.value as MemberDocument,
        sendMessageToMember.value,
      );
    }
  }
}
