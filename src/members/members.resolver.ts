import {
  Resolver,
  Mutation,
  Args,
  Context,
  Info,
  Query,
} from '@nestjs/graphql';
import { Response } from 'express';
import { fieldsList } from 'graphql-fields-list';
import { MembersService } from './members.service';
import { Member } from './entities/member.entity';
import { RegisterMemberInput } from './dto/input/register-member.input';
import { RegisterMemberOutput } from './dto/ouput/register-member-ouput';
import { getResult } from '../helpers/code.helper';
import { LoginMemberInput } from './dto/input/login-member.input';
import { LoginMemberOutput } from './dto/ouput/logjn-member-ouput';
import { ConfigService } from 'nestjs-config';
import { ForgotPasswordInput } from './dto/input/forgot-password.input';
import { CommonOutput } from '../common/CommonOutput';
import { ConfirmMemberInput } from './dto/input/confirm-member-input';
import { ResetPasswordInput } from './dto/input/reset-password-input';
import { MailService } from '../mail/mail.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { JWTTokenData } from '../types/JWTToken';
import { RedisService } from '../redis/redis.service';
import { MemberOnlineOutput } from './dto/ouput/member-online.ouput';
import { MembersInfoOutput } from './dto/ouput/members-info.output';
import { MembersUpdateProfilPicInput } from './dto/input/members-update-profil-pic-input';

@Resolver(() => Member)
export class MembersResolver {
  constructor(
    private readonly membersService: MembersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly redisSerivce: RedisService,
  ) {}

  @Mutation(() => RegisterMemberOutput)
  async register(
    @Args('registerMemberInput') registerMemberInput: RegisterMemberInput,
  ): Promise<RegisterMemberOutput> {
    const { code, message, value } = await this.membersService.register(
      registerMemberInput,
    );

    this.mailService.sendConfirmAccountMail(
      value.email,
      value.registration_information.token,
    );

    return {
      result: getResult(code),
      message,
    };
  }

  @Mutation(() => CommonOutput)
  async forgotPassword(
    @Args('forgotPasswordInput') forgotPasswordInput: ForgotPasswordInput,
  ): Promise<RegisterMemberOutput> {
    const { code, message, value } = await this.membersService.forgotPassword(
      forgotPasswordInput.email,
    );

    this.mailService.sendForgotPasswordMail(
      value.email,
      value.forgot_password.token,
    );

    return {
      result: getResult(code),
      message,
    };
  }

  @Mutation(() => CommonOutput)
  async resetPassword(
    @Args('resetPasswordInput') resetPasswordInput: ResetPasswordInput,
  ): Promise<RegisterMemberOutput> {
    const { code, message } = await this.membersService.resetPassword(
      resetPasswordInput.email,
      resetPasswordInput.token,
      resetPasswordInput.newPassword,
    );
    return {
      result: getResult(code),
      message,
    };
  }

  @Mutation(() => CommonOutput)
  async confirmAccount(
    @Args('confirmAccountInput') confirmAccountInput: ConfirmMemberInput,
  ): Promise<RegisterMemberOutput> {
    const { code, message, value } = await this.membersService.confirmAccount(
      confirmAccountInput.email,
      confirmAccountInput.token,
    );

    this.mailService.sendAccountConfirmedMail(value.email);

    return {
      result: getResult(code),
      message,
    };
  }

  @Mutation(() => LoginMemberOutput)
  async login(
    @Args('loginMemberInput') loginMemberInput: LoginMemberInput,
    @Context() ctx,
  ): Promise<LoginMemberOutput> {
    const { code, message, value } = await this.membersService.login(
      loginMemberInput,
    );

    const result = getResult(code);
    if (result) {
      (ctx.res as Response).cookie(
        this.configService.get('token.refreshTokenName'),
        value.refreshToken,
        {
          maxAge: 2147483647,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        },
      );
    }

    return {
      result,
      message,
      token: value ? value.token : '',
    };
  }

  @Mutation(() => CommonOutput)
  @UseGuards(GqlAuthGuard)
  async membersUpdateProfilPic(
    @Args('membersUpdateProfilPicInput')
    membersUpdateProfilPicInput: MembersUpdateProfilPicInput,
    @CurrentUser() user: JWTTokenData,
  ): Promise<CommonOutput> {
    const { code, message } = await this.membersService.updateProfilPic(
      user._id,
      membersUpdateProfilPicInput,
    );

    return {
      result: getResult(code),
      message,
    };
  }

  @Query(() => Member)
  @UseGuards(GqlAuthGuard)
  async myInformation(@CurrentUser() user: JWTTokenData, @Info() info) {
    return await this.membersService.getMyInfo(
      user._id,
      fieldsList(info),
      true,
    );
  }

  @Query(() => MemberOnlineOutput)
  @UseGuards(GqlAuthGuard)
  async membersOnline(): Promise<MemberOnlineOutput> {
    const membersOnline = await this.redisSerivce.getUsersConncted();
    return {
      result: true,
      message: '',
      values: membersOnline,
    };
  }

  @Query(() => MembersInfoOutput)
  @UseGuards(GqlAuthGuard)
  async membersInfo(): Promise<MembersInfoOutput> {
    const members = await this.membersService.findAll(
      ['_id', 'username', 'email', 'profilPic', 'isOnline'],
      true,
    );

    return {
      result: true,
      message: '',
      members: members as Member[],
    };
  }

  @Query(() => String)
  sayHello() {
    return 'Hello';
  }
}
