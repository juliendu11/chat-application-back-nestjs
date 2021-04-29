import { Module, Global } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersResolver } from './members.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { Member, MemberSchema } from './entities/member.entity';
import { MailModule } from '../mail/mail.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
    MailModule,
  ],
  providers: [MembersResolver, MembersService],
  exports: [MembersService],
})
export class MembersModule {}
