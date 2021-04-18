import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import * as jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { ConfigService, InjectConfig } from 'nestjs-config';
import { generateRandomToken } from '../helpers/random.helper';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { LoginResult } from '../types/LoginResult';
import { LoginMemberInput } from './dto/input/login-member.input';
import { RegisterMemberInput } from './dto/input/register-member.input';
import { Member, MemberDocument } from './entities/member.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
    @InjectConfig() private readonly config: ConfigService,
  ) {}

  async checkExist(username: string, email: string): Promise<boolean> {
    return await this.memberModel.exists({ $or: [{ email }, { username }] });
  }

  async register({
    username,
    email,
    password,
  }: RegisterMemberInput): Promise<ServiceResponseType<Member>> {
    const exist = await this.checkExist(username, email);
    if (exist) {
      return {
        code: 400,
        message: 'An account already exists with this email or username',
      };
    }

    const member = await this.memberModel.create({
      email,
      password: bcrypt.hashSync(password, 10),
      username,
      confirmed: false,
      registration_information: {
        date: new Date(),
        expiration_date: dayjs().add(2, 'days').toDate(),
        token: generateRandomToken(),
      },
    });

    return {
      code: 200,
      message: 'A confirmation email has been sent to you',
      value: member,
    };
  }

  async login({
    id,
    password,
  }: LoginMemberInput): Promise<ServiceResponseType<LoginResult | null>> {
    const member = await this.memberModel
      .findOne({ $or: [{ email: id }, { username: id }] })
      .lean();
    if (!member) {
      return { code: 401, message: 'Bad information', value: null };
    }

    if (!bcrypt.compareSync(password, member.password)) {
      return {
        message: 'Bad information, bad password',
        code: 401,
        value: null,
      };
    }

    if (!member.confirmed) {
      return {
        code: 401,
        message: 'Your account is not confirmed',
        value: null,
      };
    }

    return {
      code: 200,
      message: '',
      value: {
        token: this.createJWTToken(member),
        refreshToken: this.createRefreshToken(),
      },
    };
  }

  async forgotPassword(email: string): Promise<ServiceResponseType<Member>> {
    const member = await this.memberModel.findOne({ email });
    if (!member) {
      return { code: 401, message: 'Bad information', value: null };
    }

    const dateNow = dayjs();

    member.forgot_password.date = dateNow.toDate();
    member.forgot_password.expiration_date = dateNow.add(1, 'days').toDate();
    member.forgot_password.token = generateRandomToken();

    await member.save();

    return {
      code: 200,
      message: 'An email has been sent to you to change your password',
    };
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<ServiceResponseType<undefined>> {
    const member = await this.memberModel.findOne({
      email,
      'forgot_password.token': token,
    });

    if (!member) {
      return { code: 401, message: 'Bad information', value: null };
    }

    const dateNow = dayjs();

    if (!dateNow.isBefore(member.forgot_password.expiration_date)) {
      return {
        message: 'The token has expired',
        code: 401,
      };
    }

    member.forgot_password.token = '';
    member.password = bcrypt.hashSync(newPassword, 10);

    await member.save();

    return {
      code: 200,
      message: 'Congratulations your password has been changed',
    };
  }

  async confirmAccount(
    email: string,
    token: string,
  ): Promise<ServiceResponseType<Member>> {
    const member = await this.memberModel.findOne({
      email,
      'registration_information.token': token,
    });

    if (!member) {
      return { code: 401, message: 'Bad information', value: null };
    }

    const dateNow = dayjs();

    if (!dateNow.isBefore(member.registration_information.expiration_date)) {
      return {
        message: 'The token has expired',
        code: 401,
      };
    }

    member.registration_information.token = '';
    member.confirmed = true;

    await member.save();

    return {
      code: 200,
      message: 'Congratulations your account has been confirmed',
      value: member,
    };
  }

  createJWTToken({ _id, email, username }: Member) {
    const expHour = this.config.get('jsonwebtoken.time');
    const secret = this.config.get('jsonwebtoken.key');

    const tokenData = JSON.parse(JSON.stringify({ email, username, _id }));
    return jwt.sign(
      { data: tokenData, iat: Math.floor(Date.now() / 1000) - 30 },
      secret,
      {
        expiresIn: `${expHour}h`,
        issuer: 'myApp.com',
        audience: 'myApp.com',
      },
    );
  }

  createRefreshToken(): string {
    return generateRandomToken();
  }
}
