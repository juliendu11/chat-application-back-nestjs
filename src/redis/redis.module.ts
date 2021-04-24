import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  exports: [RedisService],
  providers: [RedisService],
})
export class RedisModule {}
