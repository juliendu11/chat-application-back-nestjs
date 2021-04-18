import { Injectable } from '@nestjs/common';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { ConfigService } from 'nestjs-config';

@Injectable()
export class MongooseFactory implements MongooseOptionsFactory {
  constructor(private readonly config: ConfigService) {
    this.config = config;
  }

  createMongooseOptions(): MongooseModuleOptions {
    let uri = 'mongodb://';

    const host = this.config.get('mongo.host') as string;
    const port = this.config.get('mongo.port') as string;
    const dbName = this.config.get('mongo.dbName') as string;
    const username = this.config.get('mongo.username') as string;
    const password = this.config.get('mongo.password') as string;
    const isAdminAuth = this.config.get('mongo.isAdminAuth') as boolean;

    if (username) {
      uri += `${username}:${password}@${host}:${port}/${dbName}`;

      if (isAdminAuth) {
        uri += '?authSource=admin';
      }
    } else {
      uri += `${host}/${dbName}`;
    }

    return {
      uri,
    };
  }
}
