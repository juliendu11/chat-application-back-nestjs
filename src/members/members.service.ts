import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import * as jwt from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import { NestjsWinstonLoggerService } from 'nestjs-winston-logger';
import { ConfigService, InjectConfig } from 'nestjs-config';
import { generateRandomToken } from '../helpers/random.helper';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { JWTToken, JWTTokenData } from '../types/JWTToken';
import { LoginResult } from '../types/LoginResult';
import { MemberLoginInput } from './dto/input/member-login.input';
import { MemberRegisterInput } from './dto/input/member-register.input';
import { Member, MemberDocument } from './entities/member.entity';
import { getResult } from '../helpers/code.helper';
import { RedisService } from '../redis/redis.service';
import { RefreshTokenResult } from '../types/RefreshTokenResult';
import { DeadPushSubscription } from 'src/types/DeadPushSubscription';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
    @InjectConfig() private readonly config: ConfigService,
    private logger: NestjsWinstonLoggerService,
    private readonly redisService: RedisService,
  ) {
    logger.setContext(MembersService.name);
  }

  async findAll(
    selectedFields = [],
    lean = false,
  ): Promise<ServiceResponseType<Member[]>> {
    try {
      this.logger.log(
        `>>>> [findAll] Use with ${JSON.stringify({ selectedFields, lean })}`,
      );
      const members = await this.memberModel
        .find({})
        .select(selectedFields.join(' '))
        .lean(lean);

      const response = {
        code: 200,
        message: '',
        value: members as Member[],
      };

      this.logger.log(
        `<<<< [findAll] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [findAll] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: [],
      };
    }
  }

  async findOne(
    id: string,
    selectedFields = [],
    lean = false,
  ): Promise<ServiceResponseType<Member | null>> {
    try {
      this.logger.log(
        `>>>> [findOne] Use with ${JSON.stringify({
          id,
          selectedFields,
          lean,
        })}`,
      );
      const member = await this.memberModel
        .findById(Types.ObjectId(id))
        .select(selectedFields.join(' '))
        .lean(lean);

      const response = {
        code: 200,
        message: '',
        value: member as Member,
      };

      this.logger.log(
        `<<<< [findOne] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [findOne] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async register({
    username,
    email,
    password,
  }: MemberRegisterInput): Promise<ServiceResponseType<Member | null>> {
    try {
      this.logger.log(
        `>>>> [register] Use with ${JSON.stringify({
          username,
          email,
          password,
        })}`,
      );

      const exist = await this.checkExist(username, email);
      if (exist) {
        const response = {
          code: 400,
          message: 'An account already exists with this email or username',
          value: null,
        };

        this.logger.log(
          `<<<< [register] Response: ${JSON.stringify({ response })}`,
        );

        return response;
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
        profilPic: `uploads/pictures/${username}.jpg`,
      });

      const response = {
        code: 200,
        message: 'A confirmation email has been sent to you',
        value: member,
      };

      this.logger.log(
        `<<<< [register] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [register] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  private async checkExist(username: string, email: string): Promise<boolean> {
    return await this.memberModel.exists({ $or: [{ email }, { username }] });
  }

  async login({
    id,
    password,
  }: MemberLoginInput): Promise<ServiceResponseType<LoginResult | null>> {
    try {
      this.logger.log(
        `>>>> [login] Use with ${JSON.stringify({
          id,
          password,
        })}`,
      );

      const member = await this.memberModel
        .findOne({ $or: [{ email: id }, { username: id }] })
        .lean();
      if (!member) {
        const response = { code: 401, message: 'Bad information', value: null };

        this.logger.log(
          `<<<< [login] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      if (!(await bcrypt.compare(password, member.password))) {
        const response = {
          message: 'Bad information, bad password',
          code: 401,
          value: null,
        };

        this.logger.log(
          `<<<< [login] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      if (!member.confirmed) {
        const response = {
          code: 401,
          message: 'Your account is not confirmed',
          value: null,
        };

        this.logger.log(
          `<<<< [login] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      const response = {
        code: 200,
        message: '',
        value: {
          token: this.createJWTToken(
            member._id,
            member.email,
            member.username,
            member.profilPic,
          ),
          refreshToken: this.createRefreshToken(member._id),
          member: member as Member,
        },
      };

      this.logger.log(`<<<< [login] Response: ${JSON.stringify({ response })}`);

      return response;
    } catch (error) {
      this.logger.error(`<<<< [login] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async forgotPassword(
    email: string,
  ): Promise<ServiceResponseType<Member | null>> {
    try {
      this.logger.log(
        `>>>> [forgotPassword] Use with ${JSON.stringify({
          email,
        })}`,
      );

      const member = await this.memberModel
        .findOne({ email })
        .select('email forgot_password');
      if (!member) {
        const response = { code: 401, message: 'Bad information', value: null };

        this.logger.log(
          `<<<< [forgotPassword] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      const dateNow = dayjs();

      member.forgot_password.date = dateNow.toDate();
      member.forgot_password.expiration_date = dateNow.add(1, 'days').toDate();
      member.forgot_password.token = generateRandomToken();

      await member.save();

      const response = {
        code: 200,
        message: 'An email has been sent to you to change your password',
        value: member,
      };

      this.logger.log(
        `<<<< [forgotPassword] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [forgotPassword] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [resetPassword] Use with ${JSON.stringify({
          email,
          token,
          newPassword,
        })}`,
      );

      const member = await this.memberModel.findOne({
        email,
        'forgot_password.token': token,
      });

      if (!member) {
        const response = { code: 401, message: 'Bad information', value: null };

        this.logger.log(
          `<<<< [resetPassword] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      const dateNow = dayjs();

      if (!dateNow.isBefore(member.forgot_password.expiration_date)) {
        const response = {
          message: 'The token has expired',
          code: 401,
          value: null,
        };

        this.logger.log(
          `<<<< [resetPassword] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      member.forgot_password.token = '';
      member.password = bcrypt.hashSync(newPassword, 10);

      await member.save();

      const response = {
        code: 200,
        message: 'Congratulations your password has been changed',
        value: null,
      };

      this.logger.log(
        `<<<< [resetPassword] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [resetPassword] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async confirmAccount(
    email: string,
    token: string,
  ): Promise<ServiceResponseType<Member | null>> {
    try {
      this.logger.log(
        `>>>> [confirmAccount] Use with ${JSON.stringify({
          email,
          token,
        })}`,
      );

      const member = await this.memberModel.findOne({
        email,
        'registration_information.token': token,
      });

      if (!member) {
        const response = { code: 401, message: 'Bad information', value: null };

        this.logger.log(
          `<<<< [confirmAccount] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      const dateNow = dayjs();

      if (!dateNow.isBefore(member.registration_information.expiration_date)) {
        const response = {
          message: 'The token has expired',
          code: 401,
        };

        this.logger.log(
          `<<<< [confirmAccount] Response: ${JSON.stringify({ response })}`,
        );

        return response;
      }

      member.registration_information.token = '';
      member.confirmed = true;

      await member.save();

      const response = {
        code: 200,
        message: 'Congratulations your account has been confirmed',
        value: member,
      };

      this.logger.log(
        `<<<< [confirmAccount] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [confirmAccount] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async addRoomCreated(
    userId: string,
    roomId: string,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [addRoomCreated] Use with ${JSON.stringify({
          userId,
          roomId,
        })}`,
      );

      await this.memberModel.updateOne(
        { _id: Types.ObjectId(userId) },
        { $push: { rooms: Types.ObjectId(roomId) } },
      );

      const response = {
        code: 200,
        message: '',
      };

      this.logger.log(
        `<<<< [addRoomCreated] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [addRoomCreated] Exception`, error);

      return {
        code: 500,
        message: error.message,
      };
    }
  }

  async removeRoomCreated(
    userId: string,
    roomId: string,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [removeRoomCreated] Use with ${JSON.stringify({
          userId,
          roomId,
        })}`,
      );

      await this.memberModel.updateOne(
        { _id: Types.ObjectId(userId) },
        { $pull: { rooms: Types.ObjectId(roomId) } },
      );

      const response = {
        code: 200,
        message: '',
      };

      this.logger.log(
        `<<<< [removeRoomCreated] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [removeRoomCreated] Exception`, error);

      return {
        code: 500,
        message: error.message,
      };
    }
  }

  async getMyInfo(
    id: string,
    selectedFields: string[] = [],
    lean = false,
  ): Promise<ServiceResponseType<Member | null>> {
    try {
      this.logger.log(
        `>>>> [getMyInfo] Use with ${JSON.stringify({
          id,
          selectedFields,
          lean,
        })}`,
      );

      const member = await this.memberModel
        .findById(Types.ObjectId(id))
        .select(selectedFields.join(' '))
        .lean(lean);

      const response = {
        code: 200,
        message: '',
        value: member as Member,
      };

      this.logger.log(
        `<<<< [getMyInfo] Response: ${JSON.stringify({ response })}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [getMyInfo] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async updateMemberOnline(id: string, value: boolean) {
    await this.memberModel.updateOne(
      { _id: Types.ObjectId(id) },
      { isOnline: value },
    );
  }

  public async generateNewTokenFromRefreshToken(
    oldToken: string,
    refreshToken: string,
  ): Promise<ServiceResponseType<RefreshTokenResult | null>> {
    try {
      this.logger.log(
        `>>>> [generateNewTokenFromRefreshToken] Use with ${JSON.stringify({
          refreshToken,
        })}`,
      );

      refreshToken = refreshToken.replace('Bearer ', '');
      oldToken = oldToken.replace('Bearer ', '');

      const checkIfTokenIsGood = jwt.decode(oldToken);
      if (!checkIfTokenIsGood) {
        const response = {
          code: 403,
          message: 'Token is invalid',
          value: null,
        };

        this.logger.log(
          `<<<< [generateNewTokenFromRefreshToken] Response: ${JSON.stringify(
            response,
          )}`,
        );

        return response;
      }

      const checkIfRefreshTokenIsGood = jwt.verify(
        refreshToken,
        this.config.get('refreshtoken.key'),
      );
      if (!checkIfRefreshTokenIsGood) {
        const response = {
          code: 403,
          message: 'Refresh token is invalid',
          value: null,
        };

        this.logger.log(
          `<<<< [generateNewTokenFromRefreshToken] Response: ${JSON.stringify(
            response,
          )}`,
        );

        return response;
      }

      const findMemberSessionInStore = await this.redisService.getUserSession(
        (checkIfTokenIsGood as JWTToken).data.username,
      );
      if (
        !getResult(findMemberSessionInStore.code) ||
        !findMemberSessionInStore.value
      ) {
        const response = {
          code: 403,
          message: findMemberSessionInStore.message,
          value: null,
        };

        this.logger.log(
          `<<<< [generateNewTokenFromRefreshToken] Response: ${JSON.stringify(
            response,
          )}`,
        );

        return response;
      }

      if (refreshToken !== findMemberSessionInStore.value.refreshToken) {
        const response = {
          code: 400,
          message: 'Bad refresh token',
          value: null,
        };

        this.logger.log(
          `<<<< [generateNewTokenFromRefreshToken] Response: ${JSON.stringify(
            response,
          )}`,
        );

        return response;
      }

      if (oldToken !== findMemberSessionInStore.value.jwtToken) {
        const response = { code: 400, message: 'Bad token', value: null };

        this.logger.log(
          `<<<< [generateNewTokenFromRefreshToken] Response: ${JSON.stringify(
            response,
          )}`,
        );

        return response;
      }

      const newToken = this.createJWTToken(
        findMemberSessionInStore.value._id,
        findMemberSessionInStore.value.email,
        findMemberSessionInStore.value.username,
        findMemberSessionInStore.value.profilPic,
      );

      const response = {
        code: 200,
        message: '',
        value: {
          newToken,
          username: findMemberSessionInStore.value.username,
        },
      };

      this.logger.log(
        `<<<< [generateNewTokenFromRefreshToken] Response: ${JSON.stringify(
          response,
        )}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `<<<< [generateNewTokenFromRefreshToken] Exception`,
        error,
      );

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  private createJWTToken(
    _id: string,
    email: string,
    username: string,
    profilPic: string,
  ) {
    const expHour = this.config.get('jsonwebtoken.time');
    const secret = this.config.get('jsonwebtoken.key');

    const tokenData: JWTTokenData = {
      email,
      username,
      profilPic,
      _id: _id.toString(),
    };

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

  private createRefreshToken(_id: string): string {
    const expWeek = this.config.get('refreshtoken.time');
    const secret = this.config.get('refreshtoken.key');

    return jwt.sign(
      { data: { _id }, iat: Math.floor(Date.now() / 1000) - 30 },
      secret,
      {
        expiresIn: `${expWeek}w`,
        issuer: 'myApp.com',
        audience: 'myApp.com',
      },
    );
  }

  async addPushSubscription(
    memberId: string,
    endpoint: string,
    auth: string,
    p256dh: string,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [addPushSubscription] Use with ${JSON.stringify({
          memberId,
          endpoint,
          auth,
          p256dh,
        })}`,
      );

      const getMember = await this.findOne(
        memberId,
        ['push_subscriptions'],
        false,
      );
      if (!getMember || !getMember.value) {
        const response = { code: 400, message: 'Bad data', value: null };

        this.logger.log(
          `<<<< [addPushSubscription] Response: ${JSON.stringify(response)}`,
        );
      }

      if (
        getMember.value.push_subscriptions.some(
          (x) =>
            x.endpoint === endpoint && x.auth === auth && x.p256dh === p256dh,
        )
      ) {
        const response = {
          code: 200,
          message: 'This subscription already exist',
          value: null,
        };

        this.logger.log(
          `<<<< [addPushSubscription] Response: ${JSON.stringify(response)}`,
        );
      }
      getMember.value.push_subscriptions.push({
        endpoint,
        p256dh,
        auth,
      });

      await (getMember.value as MemberDocument).save();

      const response = { code: 200, message: '', value: null };

      this.logger.log(
        `<<<< [addPushSubscription] Response: ${JSON.stringify(response)}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [addPushSubscription] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async deleteDeadPushSub(
    member: MemberDocument,
    deadSubs: DeadPushSubscription[],
  ): Promise<ServiceResponseType<undefined>> {
    try {
      this.logger.log(
        `>>>> [deleteDeadPushSub] Use with ${JSON.stringify({
          email: member.email,
          deadSubs,
        })}`,
      );

      deadSubs.forEach((deadSub) => {
        member.push_subscriptions = member.push_subscriptions.filter(
          (x) =>
            x.auth !== deadSub.auth &&
            x.endpoint !== deadSub.endpoint &&
            x.p256dh !== deadSub.p256dh,
        );
      });
      await member.save();

      const response = { code: 200, message: '', value: null };

      this.logger.log(
        `<<<< [deleteDeadPushSub] Response: ${JSON.stringify(response)}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`<<<< [addPushSubscription] Exception`, error);

      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }
}
