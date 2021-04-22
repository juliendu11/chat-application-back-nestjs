import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService, InjectConfig } from 'nestjs-config';
import { createAdapter } from 'socket.io-redis';
import { RedisClient } from 'redis';
import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';

export class RedisIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }
  createIOServer(port: number): any {
    const server = super.createIOServer(port);

    const pubClient = new RedisClient({
      host: this.configService.get('redis.HOST'),
      port: parseInt(this.configService.get('redis.PORT')),
    });
    const subClient = pubClient.duplicate();

    const redisAdapter = createAdapter({
      pubClient,
      subClient,
    });
    server.adapter(redisAdapter);
    return server;
  }
}
