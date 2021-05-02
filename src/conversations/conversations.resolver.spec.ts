import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsResolver } from './conversations.resolver';
import { ConversationsService } from './conversations.service';

describe('ConversationsResolver', () => {
  let resolver: ConversationsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationsResolver, ConversationsService],
    }).compile();

    resolver = module.get<ConversationsResolver>(ConversationsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
