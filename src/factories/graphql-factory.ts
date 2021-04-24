import { Injectable } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory } from '@nestjs/graphql';
import { ConfigService } from 'nestjs-config';
import * as path from 'path';
import jwt from 'jsonwebtoken';

@Injectable()
export class GraphqlQLFactory implements GqlOptionsFactory {
  constructor(private readonly config: ConfigService) {
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
      // subscriptions: {
      //   onConnect: (connectionParams: any) => {
      //     if (connectionParams.authorization) {
      //       return this.validateToken(connectionParams.authorization).then(
      //         (user) => {
      //           return {
      //             currentUser: user,
      //           };
      //         },
      //       );
      //     }
      //   },
      // },
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
