import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('Health & Status')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root endpoint', description: 'Basic health check to verify NestJS is running' })
  @ApiOkResponse({
    description: 'NestJS application is running',
    schema: {
      type: 'string',
      example: 'NestJS app is running!'
    }
  })
  getRoot(): string {
    return 'NestJS app is running!';
  }

  @Get('/hello')
  @ApiOperation({ summary: 'Hello endpoint', description: 'Simple hello world endpoint' })
  @ApiOkResponse({
    description: 'Hello world message',
    schema: {
      type: 'string',
      example: 'Hello World!'
    }
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/health')
  @ApiOperation({ 
    summary: 'Health check', 
    description: 'Detailed health status of the application' 
  })
  @ApiOkResponse({
    description: 'Application health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', example: '1.0.0' }
      }
    }
  })
  getHealth(): { status: string; timestamp: string; version: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
