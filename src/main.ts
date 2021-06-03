import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import {
  NestjsWinstonLoggerService,
  appendRequestIdToLogger,
  LoggingInterceptor,
  configMorgan,
  morganRequestLogger,
  morganResponseLogger,
  appendIdToRequest,
  TOKEN_TYPE,
} from 'nestjs-winston-logger';

import { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get('ConfigService');

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(cookieParser());

  const globalLogger = new NestjsWinstonLoggerService({
    format: format.combine(
      format.timestamp({ format: "isoDateTime" }),
      format.json(),
      format.colorize({ all: true }),
    ),
    transports: [
      new transports.Console(),
      new DailyRotateFile({
        filename: "%DATE%.log",
        datePattern: "DD-MM-YYYY",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "14d",
        dirname: "logs",
      })
    ],
  });
  app.useLogger(globalLogger);

  // append id to identify request
  app.use(appendIdToRequest);
  app.use(appendRequestIdToLogger(globalLogger));

  configMorgan.appendMorganToken('reqId', TOKEN_TYPE.Request, 'reqId');
  app.use(morganRequestLogger(globalLogger));
  app.use(morganResponseLogger(globalLogger));

  app.useGlobalInterceptors(new LoggingInterceptor(globalLogger));

  const origin = config.get('cors.allowedOrigin');
  app.enableCors({ origin, credentials: true });

  await app.listen(config.get('express.port'));
}
bootstrap();
