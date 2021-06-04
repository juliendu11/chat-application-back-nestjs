import { Injectable } from '@nestjs/common';
import { JwtModuleOptions, JwtOptionsFactory } from '@nestjs/jwt';
import { ConfigService } from 'nestjs-config';

@Injectable()
export class JwtFactory implements JwtOptionsFactory {
  constructor(private readonly config: ConfigService) {
    this.config = config;
  }
  createJwtOptions(): JwtModuleOptions | Promise<JwtModuleOptions> {
    return {
      secret: this.config.get('jsonwebtoken.key'),
      signOptions: { expiresIn: `${this.config.get('jsonwebtoken.time')}h` },
    };
  }
}
