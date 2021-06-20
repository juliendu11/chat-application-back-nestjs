import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationResolver } from './push-notification.resolver';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationResolver', () => {
  let resolver: PushNotificationResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PushNotificationResolver, PushNotificationService],
    }).compile();

    resolver = module.get<PushNotificationResolver>(PushNotificationResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
