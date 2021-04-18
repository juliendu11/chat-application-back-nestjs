import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessage } from './entities/direct-message.entity';
import { CreateDirectMessageInput } from './dto/create-direct-message.input';
import { UpdateDirectMessageInput } from './dto/update-direct-message.input';

@Resolver(() => DirectMessage)
export class DirectMessagesResolver {
  constructor(private readonly directMessagesService: DirectMessagesService) {}

  @Mutation(() => DirectMessage)
  createDirectMessage(@Args('createDirectMessageInput') createDirectMessageInput: CreateDirectMessageInput) {
    return this.directMessagesService.create(createDirectMessageInput);
  }

  @Query(() => [DirectMessage], { name: 'directMessages' })
  findAll() {
    return this.directMessagesService.findAll();
  }

  @Query(() => DirectMessage, { name: 'directMessage' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.directMessagesService.findOne(id);
  }

  @Mutation(() => DirectMessage)
  updateDirectMessage(@Args('updateDirectMessageInput') updateDirectMessageInput: UpdateDirectMessageInput) {
    return this.directMessagesService.update(updateDirectMessageInput.id, updateDirectMessageInput);
  }

  @Mutation(() => DirectMessage)
  removeDirectMessage(@Args('id', { type: () => Int }) id: number) {
    return this.directMessagesService.remove(id);
  }
}
