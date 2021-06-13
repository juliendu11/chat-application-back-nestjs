import { ObjectType, Field } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Member } from '../../../members/entities/member.entity';

@ObjectType()
@Schema({ _id: false, id: false })
export class MessageMedia {
  @Field(() => String)
  @Prop()
  type: string;

  @Field(() => String)
  @Prop()
  path: string;
}
export const MessageMediaSchema = SchemaFactory.createForClass(MessageMedia);

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

  @Field(() => [MessageMedia], { nullable: true })
  @Prop({
    type: [MessageMediaSchema],
    default: [],
  })
  medias: MessageMedia[];
}
export const MessageSchema = SchemaFactory.createForClass(Message);
