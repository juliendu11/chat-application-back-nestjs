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
  LOG_TYPE,
} from 'nestjs-winston-logger';
import { tap } from 'rxjs/operators';
import { format, transports } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

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
      format.timestamp({ format: 'isoDateTime' }),
      format.json(),
      format.colorize({ all: true }),
    ),
    transports: [
      new transports.Console(),
      new DailyRotateFile({
        filename: '%DATE%.log',
        datePattern: 'DD-MM-YYYY',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        dirname: 'logs',
      }),
    ],
  });
  app.useLogger(globalLogger);

  //append id to identify request
  app.use(appendIdToRequest);
  app.use(appendRequestIdToLogger(globalLogger));

  configMorgan.appendMorganToken('reqId', TOKEN_TYPE.Request, 'reqId');
  app.use(morganRequestLogger(globalLogger));
  app.use(morganResponseLogger(globalLogger));

  app.useGlobalInterceptors(new InterceptorTest(globalLogger));

  const origin = config.get('cors.allowedOrigin');
  app.enableCors({ origin, credentials: true });

  await app.listen(config.get('express.port'));
}

class InterceptorTest implements NestInterceptor {
  constructor(private logger: NestjsWinstonLoggerService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    this.logger.setContext(context.getClass().name);
    const ctx = context.switchToHttp();

    if (context.getType() === 'http') {
      // do something that is only important in the context of regular HTTP requests (REST)
      // const ctx = context.switchToHttp();
      // const request = ctx.getRequest<Request>();
      // do something
    } else if (context.getType() === 'rpc') {
      // do something that is only important in the context of Microservice requests
    } else if (context.getType<GqlContextType>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const args = gqlContext.getArgs();

      this.logger.log(
        `${JSON.stringify({
          headers: ctx.getRequest<Request>()?.headers,
          type: LOG_TYPE.REQUEST_ARGS,
          value: args,
        })}`,
      );
    }

    var replaceCircular = function (val, cache = null) {
      cache = cache || new WeakSet();

      if (val && typeof val == 'object') {
        if (cache.has(val)) return '[Circular]';

        cache.add(val);

        var obj = Array.isArray(val) ? [] : {};
        for (var idx in val) {
          obj[idx] = replaceCircular(val[idx], cache);
        }

        cache.delete(val);
        return obj;
      }

      return val;
    };

    // const now = Date.now();
    return next.handle().pipe(
      tap({
        next: (value) => {
          this.logger.log(
            `${JSON.stringify(replaceCircular({ Response: value }))}`,
          );
        },
        /*
       /**
         * Intercept error state
         */
        // error: (err) => {
        //   this.logger.error(err, "");
        // },

        /**
         * Intercept complete state
         */
        // complete: () => this.logger.log(`Finished... ${Date.now() - now}ms`),
      }),
    );
  }
}
bootstrap();
