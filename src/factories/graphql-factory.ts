import { Injectable } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory } from '@nestjs/graphql';
import { ConfigService } from 'nestjs-config';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service';
import { JWTTokenData } from '../types/JWTToken';

@Injectable()
export class GraphqlQLFactory implements GqlOptionsFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
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
        onConnect: (connectionParams: any, ws) => {
          const token = connectionParams.headers.authorization;
          if (token) {
            return this.validateToken(token).then((user: JWTTokenData) => {
              this.redisService.setUserConnected(user.username);
              return {
                currentUser: user,
              };
            });
          }
        },
        onDisconnect: async (ws, ctx) => {
          const intialContext = await ctx.initPromise;
          this.redisService.removeUserConnected(
            intialContext.currentUser.username,
          );
        },
      },
    };
  }

  validateToken(authToken: string) {
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
