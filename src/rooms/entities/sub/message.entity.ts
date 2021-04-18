import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Member } from '../../../members/entities/member.entity';

@ObjectType()
@Schema({ _id: false, id: false })
export class Message {
  @Field(() => Member)
  @Prop({ type: Types.ObjectId, ref: 'Member', required: true })
  user: Types.ObjectId | Member;

  @Field(() => Date)
  @Prop()
  date: Date;

  @Field(() => String)
  @Prop()
  message: string;
}
export const MessageSchema = SchemaFactory.createForClass(Message);
