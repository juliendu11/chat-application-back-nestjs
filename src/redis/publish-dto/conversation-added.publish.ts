import { ConversationsOutputValue } from 'src/conversations/dto/output/conversations.output';
import { CONVERSATION_ADDED } from '../redis.pub-sub';

export type ConversationAddedPublish = {
  [CONVERSATION_ADDED]: ConversationsOutputValue;
};
