import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Message, MessageSchema } from './sub/message.entity';

@ObjectType()
@Schema()
export class Room {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => String)
  @Prop({ required: true, unique: true })
  name: string;

  @Field(() => [Message])
  @Prop({ default: [] })
  messages: Message[];

  @Field(() => Message)
  @Prop({ type: MessageSchema, default: new Message() })
  last_message: Message;
}
export type RoomDocument = Room & Document;

export const RoomSchema = SchemaFactory.createForClass(Room);
