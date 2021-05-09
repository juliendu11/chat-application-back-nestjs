import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import { createWriteStream, ReadStream } from 'fs';
import { mkdir } from 'fs/promises';
import { Model, Types } from 'mongoose';
import { ConfigService, InjectConfig } from 'nestjs-config';
import { generateRandomToken } from '../helpers/random.helper';
import { ServiceResponseType } from '../interfaces/GraphqlResponse';
import { JWTTokenData } from '../types/JWTToken';
import { LoginResult } from '../types/LoginResult';
import { LoginMemberInput } from './dto/input/login-member.input';
import { RegisterMemberInput } from './dto/input/register-member.input';
import { Member, MemberDocument } from './entities/member.entity';
import { MembersUpdateProfilPicInput } from './dto/input/members-update-profil-pic-input';
import { getResult } from 'src/helpers/code.helper';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name) private memberModel: Model<MemberDocument>,
    @InjectConfig() private readonly config: ConfigService,
  ) {}

  private uploadPath = path.resolve(
    __dirname,
    '..',
    '..',
    'uploads',
    'pictures',
  );

  async findAll(
    selectedFields = [],
    lean = false,
  ): Promise<ServiceResponseType<Member[]>> {
    try {
      const members = await this.memberModel
        .find({})
        .select(selectedFields.join(' '))
        .lean(lean);

      return {
        code: 200,
        message: '',
        value: members as Member[],
      };
    } catch (error) {
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
      const member = await this.memberModel
        .findById(Types.ObjectId(id))
        .select(selectedFields.join(' '))
        .lean(lean);

      return {
        code: 200,
        message: '',
        value: member as Member,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message,
        value: null,
      };
    }
  }

  async updateProfilPic(
    id: string,
    membersUpdateProfilPicInput: MembersUpdateProfilPicInput,
  ): Promise<ServiceResponseType<undefined>> {
    try {
      if (!membersUpdateProfilPicInput.filesSelected) {
        return { code: 400, message: 'No file to upload', value: null };
      }

      const getMember = await this.findOne(id, ['username'], true);
      if (!getResult(getMember.code) || !getMember.value) {
        return { code: 404, message: 'Member account not found', value: null };
      }

      const link = path.resolve(
        this.uploadPath,
        `${getMember.value.username}.jpg`,
      );

      await mkdir(this.uploadPath, { recursive: true });

      const {
        createReadStream,
      } = await membersUpdateProfilPicInput.filesSelected;
      const stream = createReadStream();

      return await this.writeFile(stream, link);
    } catch (error) {
      return {
        code: 500,
        message: error.message,
      };
    }
  }

  private async writeFile(
    stream: ReadStream,
    link: string,
  ): Promise<ServiceResponseType<undefined>> {
    return new Promise((resolve, reject) => {
      const write = createWriteStream(link);
      stream
        .pipe(write)
        .on('error', (error) => {
          resolve({ code: 500, message: error.message });
        })
        .on('finish', () => {
          resolve({ code: 200, message: link });
        });
    });
  }

  async register({
    username,
    email,
    password,
  }: RegisterMemberInput): Promise<ServiceResponseType<Member | null>> {
    try {
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
        profilPic: `uploads/pictures/${username}.jpg`,
      });

      return {
        code: 200,
        message: 'A confirmation email has been sent to you',
        value: member,
      };
    } catch (error) {
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
  }: LoginMemberInput): Promise<ServiceResponseType<LoginResult | null>> {
    try {
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
          token: this.createJWTToken(
            member._id,
            member.email,
            member.username,
            member.profilPic,
          ),
          refreshToken: this.createRefreshToken(),
        },
      };
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      await this.memberModel.updateOne(
        { _id: Types.ObjectId(userId) },
        { $push: { rooms: Types.ObjectId(roomId) } },
      );
      return {
        code: 200,
        message: '',
      };
    } catch (error) {
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
      await this.memberModel.updateOne(
        { _id: Types.ObjectId(userId) },
        { $pull: { rooms: Types.ObjectId(roomId) } },
      );
      return {
        code: 200,
        message: '',
      };
    } catch (error) {
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
      const member = await this.memberModel
        .findById(Types.ObjectId(id))
        .select(selectedFields.join(' '))
        .lean(lean);

      return {
        code: 200,
        message: '',
        value: member as Member,
      };
    } catch (error) {
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

  private createRefreshToken(): string {
    return generateRandomToken();
  }
}
