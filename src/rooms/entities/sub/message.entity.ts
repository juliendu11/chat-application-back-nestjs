import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Member } from '../../../members/entities/member.entity';

@ObjectType()
@Schema({ _id: false, id: false })
export class Message {
  @Field(() => Member)
  @Prop({ type: Types.ObjectId, ref: 'Member' })
  user: Types.ObjectId | Member;

  @Field(() => Date, { nullable: true })
  @Prop({ default: new Date() })
  date: Date;

  @Field(() => String, { nullable: true })
  @Prop()
  message: string | null;

  @Field(() => [String])
  @Prop()
  media: string[];
}
export const MessageSchema = SchemaFactory.createForClass(Message);
