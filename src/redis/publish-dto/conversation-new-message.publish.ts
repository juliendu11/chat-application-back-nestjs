import { ConversationNewMessageOutput } from '../../conversations/dto/output/conversation-new-message.output';
import { CONVERSATION_NEW_MESSAGE } from '../redis.pub-sub';

export type ConversationNewMessagePublish = {
  [CONVERSATION_NEW_MESSAGE]: ConversationNewMessageOutput;
};
