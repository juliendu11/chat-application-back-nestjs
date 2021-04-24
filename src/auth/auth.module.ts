import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtFactory } from '../factories/jwt-options.factory';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useClass: JwtFactory,
    }),
  ],
  providers: [JwtStrategy],
})
export class AuthModule {}
