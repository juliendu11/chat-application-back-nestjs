import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsResolver } from './rooms.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from './entities/room.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
  ],
  providers: [RoomsResolver, RoomsService],
})
export class RoomsModule {}
