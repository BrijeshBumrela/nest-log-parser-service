import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as config from 'config';
import { createLogger, transports, format } from 'winston';
import * as path from 'path';
const Tail = require('tail').Tail;

async function bootstrap() {
  const filePath = path.join(__dirname, '../combined.log');
  const tail = new Tail(filePath);
  tail.on("line", (data) => {
    console.log('data data data', data);
  })

  const serverConfig = config.get('server');
  const logger = createLogger({
    level: 'info',
    format: format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      //
      // - Write all logs with level `error` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' })
    ]
  });
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'development') {
    app.enableCors();
  } else {
    app.enableCors({ origin: serverConfig.origin });
    logger.info(`Accepting requests from origin "${serverConfig.origin}"`, { "status": 200, "date": new Date() });
  }

  const port = process.env.PORT || serverConfig.port;
  await app.listen(port);
  logger.info(`Application listening on port ${port}`, { "status": 200, "date": new Date() });
}
bootstrap();
