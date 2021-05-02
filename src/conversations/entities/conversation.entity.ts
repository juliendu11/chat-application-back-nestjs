import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Member } from '../../members/entities/member.entity';
import {
  Message,
  MessageSchema,
} from '../../rooms/entities/sub/message.entity';

@ObjectType()
@Schema()
export class Conversation {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => [Member])
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Member' }] })
  members: Types.ObjectId[] | Member[];

  @Field(() => [Message])
  @Prop({ type: [MessageSchema] })
  messages: Message[];

  @Field(() => Message, { nullable: true })
  @Prop({ type: MessageSchema })
  last_message: Message;
}
export type ConversationDocument = Conversation & Document;

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
