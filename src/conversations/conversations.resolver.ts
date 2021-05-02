import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationInput } from './dto/create-conversation.input';
import { UpdateConversationInput } from './dto/update-conversation.input';

@Resolver(() => Conversation)
export class ConversationsResolver {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Mutation(() => Conversation)
  createConversation(@Args('createConversationInput') createConversationInput: CreateConversationInput) {
    return this.conversationsService.create(createConversationInput);
  }

  @Query(() => [Conversation], { name: 'conversations' })
  findAll() {
    return this.conversationsService.findAll();
  }

  @Query(() => Conversation, { name: 'conversation' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.conversationsService.findOne(id);
  }

  @Mutation(() => Conversation)
  updateConversation(@Args('updateConversationInput') updateConversationInput: UpdateConversationInput) {
    return this.conversationsService.update(updateConversationInput.id, updateConversationInput);
  }

  @Mutation(() => Conversation)
  removeConversation(@Args('id', { type: () => Int }) id: number) {
    return this.conversationsService.remove(id);
  }
}
