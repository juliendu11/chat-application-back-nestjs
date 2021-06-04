import {
  Resolver,
  Mutation,
  Args,
  Context,
  Info,
  Query,
  Subscription,
} from '@nestjs/graphql';
import { Request,Response } from 'express';
import { fieldsList } from 'graphql-fields-list';
import { MembersService } from './members.service';
import { Member } from './entities/member.entity';
import { MemberRegisterInput } from './dto/input/member-register.input';
import { MemberRegisterOutput } from './dto/ouput/member-register-ouput';
import { getResult } from '../helpers/code.helper';
import { MemberLoginInput } from './dto/input/member-login.input';
import { MemberLoginOutput } from './dto/ouput/member-login.output';
import { ConfigService } from 'nestjs-config';
import { MemberForgotPasswordInput } from './dto/input/member-forgot-password.input';
import { CommonOutput } from '../common/CommonOutput';
import { MemberConfirmMemberInput } from './dto/input/member-confirm.input';
import { MemberResetPasswordInput } from './dto/input/member-reset-password-input';
import { MailService } from '../mail/mail.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/graphql-current-user.decorator';
import { JWTTokenData } from '../types/JWTToken';
import { RedisService } from '../redis/redis.service';
import { MemberOnlineOutput, MemberOnlineOutputUser } from './dto/ouput/member-online.ouput';
import { MembersInfoOutput } from './dto/ouput/members-info.output';
import { MembersUpdateProfilPicInput } from './dto/input/members-update-profil-pic-input';
import { MEMBER_OFFLINE, MEMBER_ONLINE } from 'src/redis/redis.pub-sub';
import { RoomMessageAddedOuput } from 'src/rooms/dto/output/room-message-added.ouput';
import { LoginResult } from 'src/types/LoginResult';
import { MemberMyInformationOutput } from './dto/ouput/member-my-information.output';
import { MemberRefreshTokenOutput } from './dto/ouput/member-refresh-token.output';

@Resolver(() => Member)
export class MembersResolver {
  constructor(
    private readonly membersService: MembersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
  ) {}

  @Mutation(() => MemberRegisterOutput)
  async memberRegister(
    @Args('memberRegisterMemberInput') memberRegisterMemberInput: MemberRegisterInput,
  ): Promise<MemberRegisterOutput> {
    const { code, message, value } = await this.membersService.register(
      memberRegisterMemberInput,
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
  async memberForgotPassword(
    @Args('memberForgotPasswordInput') memberForgotPasswordInput: MemberForgotPasswordInput,
  ): Promise<CommonOutput> {
    const { code, message, value } = await this.membersService.forgotPassword(
      memberForgotPasswordInput.email,
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
  async memberResetPassword(
    @Args('memberResetPasswordInput') memberResetPasswordInput: MemberResetPasswordInput,
  ): Promise<CommonOutput> {
    const { code, message } = await this.membersService.resetPassword(
      memberResetPasswordInput.email,
      memberResetPasswordInput.token,
      memberResetPasswordInput.newPassword,
    );
    return {
      result: getResult(code),
      message,
    };
  }

  @Mutation(() => CommonOutput)
  async memberConfirmAccount(
    @Args('memberConfirmAccountInput') memberConfirmAccountInput: MemberConfirmMemberInput,
  ): Promise<CommonOutput> {
    const { code, message, value } = await this.membersService.confirmAccount(
      memberConfirmAccountInput.email,
      memberConfirmAccountInput.token,
    );

    this.mailService.sendAccountConfirmedMail(value.email);

    return {
      result: getResult(code),
      message,
    };
  }

  @Mutation(() => MemberLoginOutput)
  async memberLogin(
    @Args('memberLoginInput') memberLoginInput: MemberLoginInput,
    @Context() ctx,
  ): Promise<MemberLoginOutput> {
    const { code, message, value } = await this.membersService.login(
      memberLoginInput,
    );

    const result = getResult(code);
    if (result) {
      this.generateRefreshTokenCookie(ctx, value);

      this.redisService.setUserSession(value.member.username, {
        email: value.member.email,
        username: value.member.username,
        _id: value.member._id.toString(),
        jwtToken: value.token,
        refreshToken:value.refreshToken,
        profilPic:value.member.profilPic,
      })
    }

    return {
      result,
      message,
      token: value ? value.token : '',
    };
  }

  private generateRefreshTokenCookie(ctx: any, value: LoginResult) {
    (ctx.res as Response).cookie(
      this.configService.get('token.refreshTokenName'),
      value.refreshToken,
      {
        maxAge: 2147483647,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      }
    );
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

  @Query(() => MemberRefreshTokenOutput)
  async memberRefreshToken(
    @Context() ctx
  ): Promise<MemberRefreshTokenOutput> {
    const refreshToken = (<Request>ctx.req).cookies[
      this.configService.get('token.refreshTokenName')
    ];

    if (!refreshToken) {
      return {
        result: false,
        message: "Unable to find refresh token",
        newToken:null
      }
    }

    const token = (<Request>ctx.req).headers.authorization;

    if (!token) {
      return {
        result: false,
        message: "Unable to find token",
        newToken:null
      }
    }

    const { code, message, value } = await this.membersService.generateNewTokenFromRefreshToken(token, refreshToken);
    
    const result = getResult(code)
    if (result && value) {
      this.redisService.updateTokenInUserSession(value.username, value.newToken)
    }

    return {
      result,
      message,
      newToken:value ? value.newToken :""
    }
  }

  @Query(() => MemberMyInformationOutput)
  @UseGuards(GqlAuthGuard)
  async memberMyInformation(@CurrentUser() user: JWTTokenData, @Info() info):Promise<MemberMyInformationOutput> {
    const {code, message, value} = await this.membersService.getMyInfo(
      user._id,
      fieldsList(info, {path:"value"}),
      true,
    );

    return {
      result:getResult(code),
      message,
      value
    }
  }

  @Query(() => MemberOnlineOutput)
  @UseGuards(GqlAuthGuard)
  async membersOnline(): Promise<MemberOnlineOutput> {
    const membersOnline = await this.redisService.getUsersConncted();
    return {
      result: true,
      message: '',
      values: membersOnline,
    };
  }

  @Query(() => MembersInfoOutput)
  @UseGuards(GqlAuthGuard)
  async membersInfo(): Promise<MembersInfoOutput> {
    const {code, message, value} = await this.membersService.findAll(
      ['_id', 'username', 'email', 'profilPic', 'isOnline'],
      true,
    );

    return {
      result: getResult(code),
      message,
      members: value,
    };
  }

  @Query(() => String)
  sayHello() {
    return 'Hello';
  }

  @Subscription(() => MemberOnlineOutputUser, {
    name: MEMBER_ONLINE,
  })
  memberOnlineHandler() {
    return this.redisService.memberOnlineListener();
  }

  @Subscription(() => MemberOnlineOutputUser, {
    name: MEMBER_OFFLINE,
  })
  memberOfflineHandler() {
    return this.redisService.memberOfflineListener();
  }
}
