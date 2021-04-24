import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Member } from '../../members/entities/member.entity';
import { Message, MessageSchema } from './sub/message.entity';

@ObjectType()
@Schema()
export class Room {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => String)
  @Prop({ required: true, unique: true })
  name: string;

  @Field(() => Boolean)
  @Prop({ default: false })
  isPrivate: boolean;

  @Field(() => [Message])
  @Prop({ default: [] })
  messages: Message[];

  @Field(() => Message, { nullable: true })
  @Prop({ type: MessageSchema })
  last_message: Message;

  @Field(() => Member)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Member' }] })
  member: Types.ObjectId | Member;
}
export type RoomDocument = Room & Document;

export const RoomSchema = SchemaFactory.createForClass(Room);
