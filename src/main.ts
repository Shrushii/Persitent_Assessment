import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configuration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = configuration();

  // Global prefix - exclude docs path and basic endpoints
  app.setGlobalPrefix(config.api.prefix, {
    exclude: [
      config.api.swagger.path, 
      `${config.api.swagger.path}/(.*)`,
      '', // Root path
      'hello', // Hello endpoint
      'health' // Health endpoint
    ],
  });

  // CORS configuration
  app.enableCors({
    origin: config.security.corsOrigin,
  });

  // Swagger configuration - serve at root level, not under API prefix
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.api.swagger.title)
    .setDescription(config.api.swagger.description)
    .setVersion(config.api.swagger.version)
    .build();
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(config.api.swagger.path, app, document);

  // Start server
  const port = config.server.port;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/${config.api.swagger.path}`);
  console.log(`🌍 Environment: ${config.server.nodeEnv}`);
}

bootstrap();
