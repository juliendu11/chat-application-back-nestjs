import { Test, TestingModule } from '@nestjs/testing';
import { DirectMessagesResolver } from './direct-messages.resolver';
import { DirectMessagesService } from './direct-messages.service';

describe('DirectMessagesResolver', () => {
  let resolver: DirectMessagesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DirectMessagesResolver, DirectMessagesService],
    }).compile();

    resolver = module.get<DirectMessagesResolver>(DirectMessagesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
