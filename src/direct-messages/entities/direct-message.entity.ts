import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@ObjectType()
@Schema()
export class DirectMessage {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => String)
  @Prop({ required: true, unique: true })
  name: string;
}
export type DirectMessageDocument = DirectMessage & Document;

export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);
