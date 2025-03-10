import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('psapi/api/v1');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const formattedErrors = errors.reduce((acc, error) => {
        acc[error.property] = Object.values(error.constraints || {}).join(', ');
        return acc;
      }, {});
      
      console.log('Validation errors:', formattedErrors);
      
      const { BadRequestException } = require('@nestjs/common');
      return new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors
      });
    },
  }));
  
  app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
  }));
  
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  
  app.enableCors({
    /*origin: [
      'https://patagonia-strike.com',
      'https://taringa-cs.com',
      'https://taringa-cs.net',
      'https://brickgame.net',
      'https://gaming-group.net',
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
    ],*/
    credentials: true,
    optionsSuccessStatus: 200,
  });
  
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 100,
      message: { error: 'Too many requests, please slow down.' },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Game Server API')
      .setDescription('API for game server management')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }
  
  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

bootstrap();