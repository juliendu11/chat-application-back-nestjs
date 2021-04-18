import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Request, Response } from 'express';

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

@Resolver(() => Member)
export class MembersResolver {
  constructor(
    private readonly membersService: MembersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
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

  @Query(() => String)
  sayHello() {
    return 'Hello';
  }
}
