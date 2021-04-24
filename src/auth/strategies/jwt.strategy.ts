import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from 'nestjs-config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTToken } from '../../types/JWTToken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jsonwebtoken.key'),
    });
  }

  async validate(payload: JWTToken) {
    return payload.data;
  }
}
