import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Get the root application message
   * @returns Basic application status message
   */
  getRoot(): string {
    return 'NestJS app is running!';
  }

  /**
   * Get hello world message
   * @returns Hello world string
   */
  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Get detailed health status of the application
   * @returns Health status object with status, timestamp, and version
   */
  getHealth(): { status: string; timestamp: string; version: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
