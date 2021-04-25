import { RoomMessageAddedOuput } from '../../rooms/dto/output/room-message-added.ouput';
import { ROOM_MESSAGE_ADDED } from '../redis.pub-sub';

export type RoomMessageAddedPublish = {
  [ROOM_MESSAGE_ADDED]: RoomMessageAddedOuput;
};
