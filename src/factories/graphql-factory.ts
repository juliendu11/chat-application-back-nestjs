import { Injectable } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory } from '@nestjs/graphql';
import { ConfigService } from 'nestjs-config';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service';
import { JWTTokenData } from '../types/JWTToken';
import { MembersService } from '../members/members.service';

@Injectable()
export class GraphqlQLFactory implements GqlOptionsFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
    private readonly memberService: MembersService,
  ) {
    this.config = config;
  }

  createGqlOptions(): GqlModuleOptions | Promise<GqlModuleOptions> {
    return {
      autoSchemaFile: path.join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      debug: false,
      cors: {
        origin: this.config.get('cors.allowedOrigin'),
        credentials: true,
      },
      installSubscriptionHandlers: true,
      uploads: false,
      context: ({ req, res }) => ({ req, res }),
      subscriptions: {
        onConnect: async (connectionParams: any, ws) => {
          // const token = connectionParams.headers.authorization;
          // if (token) {
          //   try {
          //     const user: JWTTokenData = await this.validateToken(token);
          //     this.redisService.setUserConnected(user.username, user);
          //     this.memberService.updateMemberOnline(user._id, true);
          //     return {
          //       currentUser: user,
          //     };
          //   } catch (error) {
          //     ws.close(401);
          //   }
          // }
        },
        onDisconnect: async (ws, ctx) => {
          // const intialContext = await ctx.initPromise;
          // if (!intialContext.currentUser) {
          //   ws.close(401);
          //   return;
          // }
          // this.memberService.updateMemberOnline(
          //   intialContext.currentUser._id,
          //   false,
          // );
          // this.redisService.removeUserConnected(
          //   intialContext.currentUser.username,
          // );
        },
      },
    };
  }

  validateToken(authToken: string): Promise<JWTTokenData> {
    return new Promise((resolve, reject) => {
      authToken = authToken.replace('Bearer ', '');
      jwt.verify(
        authToken,
        this.config.get('jsonwebtoken.key'),
        function (err, decoded) {
          if (err) {
            reject('Failed to authenticate token.');
          }
          resolve(decoded.data);
        },
      );
    });
  }
}
