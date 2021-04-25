import { Room } from '../../rooms/entities/room.entity';
import { ROOM_ADDED } from '../redis.pub-sub';

export type RoomAddedPublish = {
  [ROOM_ADDED]: Room;
};
