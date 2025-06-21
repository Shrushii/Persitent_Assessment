import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configuration } from '../src/config/configuration';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

describe('Payment Gateway (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Set NODE_ENV to test to bypass LLM calls
    process.env.NODE_ENV = 'test';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const config = configuration();
    
    // Set global prefix like in main.ts - exclude docs path
    app.setGlobalPrefix(config.api.prefix, {
      exclude: [config.api.swagger.path, `${config.api.swagger.path}/(.*)`],
    });
    
    // Enable CORS like in main.ts
    app.enableCors({
      origin: config.security.corsOrigin,
    });
    
    // Setup Swagger like in main.ts
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.api.swagger.title)
      .setDescription(config.api.swagger.description)
      .setVersion(config.api.swagger.version)
      .build();
    
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(config.api.swagger.path, app, document);
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return hello world', () => {
      return request(app.getHttpServer())
        .get('/api/')
        .expect(200)
        .expect('NestJS app is running!');
    });
  });

  describe('POST /payments/charge', () => {
    const validChargeRequest = {
      amount: 100,
      currency: 'USD',
      source: 'tok_test',
      email: 'user@example.com',
      ipCountry: 'US',
      billingCountry: 'US'
    };

    it('should process a valid charge request successfully', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send(validChargeRequest)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('transactionId');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('riskScore');
          expect(res.body).toHaveProperty('explanation');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body.amount).toBe(100);
          expect(res.body.currency).toBe('USD');
          expect(res.body.email).toBe('user@example.com');
        });
    }, 15000);

    it('should block transaction with large amount', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          amount: 2000
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('riskScore');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.5);
        });
    }, 15000);

    it('should block transaction with suspicious email domain', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          email: 'user@test.com'
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('riskScore');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.4);
        });
    }, 15000);

    it('should block transaction with geolocation mismatch', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          ipCountry: 'CA',
          billingCountry: 'US'
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('riskScore');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.5);
        });
    }, 15000);

    it('should block transaction with Russian IP', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          ipCountry: 'RU',
          billingCountry: 'RU'
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('riskScore');
        });
    }, 15000);

    it('should trigger velocity heuristic after multiple charges', async () => {
      const velocityRequest = {
        ...validChargeRequest,
        email: 'velocity@legitimate.com'
      };

      // Make 3 charges first
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/payments/charge')
          .send(velocityRequest)
          .expect(200);
      }

      // 4th charge should be blocked due to velocity
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send(velocityRequest)
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('riskScore');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.5);
        });
    }, 30000);

    it('should block transaction with all heuristics triggered', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          amount: 2000,
          currency: 'USD',
          source: 'tok_test',
          email: 'fraud@test.com',
          ipCountry: 'RU',
          billingCountry: 'US'
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('riskScore');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.8);
        });
    }, 15000);

    // Edge Cases
    it('should handle minimum amount (0.01)', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          amount: 0.01
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('success');
          expect(res.body.amount).toBe(0.01);
        });
    }, 15000);

    it('should handle maximum amount (999999)', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          amount: 999999
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.5);
        });
    }, 15000);

    it('should handle different currencies', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          currency: 'EUR'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.currency).toBe('EUR');
        });
    }, 15000);

    it('should handle disposable email domains', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          email: 'user@10minutemail.com'
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.4);
        });
    }, 15000);

    it('should handle case-insensitive email domains', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          email: 'user@TEST.COM'
        })
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.riskScore).toBeGreaterThanOrEqual(0.4);
        });
    }, 15000);

    // Validation Tests
    it('should reject request with missing amount', () => {
      const { amount, ...invalidRequest } = validChargeRequest;
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send(invalidRequest)
        .expect(400);
    });

    it('should reject request with negative amount', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          amount: -100
        })
        .expect(400);
    });

    it('should reject request with zero amount', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          amount: 0
        })
        .expect(400);
    });

    it('should reject request with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          email: 'invalid-email'
        })
        .expect(400);
    });

    it('should reject request with missing ipCountry', () => {
      const { ipCountry, ...invalidRequest } = validChargeRequest;
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send(invalidRequest)
        .expect(400);
    });

    it('should reject request with missing billingCountry', () => {
      const { billingCountry, ...invalidRequest } = validChargeRequest;
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send(invalidRequest)
        .expect(400);
    });

    it('should reject request with empty string values', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          email: '',
          ipCountry: '',
          billingCountry: ''
        })
        .expect(400);
    });

    it('should reject request with non-numeric amount', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          amount: 'not-a-number' as any
        })
        .expect(400);
    });

    it('should reject request with additional unknown fields', () => {
      return request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          ...validChargeRequest,
          unknownField: 'should-be-rejected'
        })
        .expect(400);
    });
  });

  describe('GET /payments/transactions', () => {
    it('should return empty array initially', () => {
      return request(app.getHttpServer())
        .get('/api/payments/transactions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });

    it('should return transactions after processing charges', async () => {
      // Make a charge first
      await request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@example.com',
          ipCountry: 'US',
          billingCountry: 'US'
        })
        .expect(200);

      // Check transactions endpoint
      return request(app.getHttpServer())
        .get('/api/payments/transactions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('transactionId');
          expect(res.body[0]).toHaveProperty('status');
          expect(res.body[0]).toHaveProperty('riskScore');
        });
    }, 20000);

    it('should return multiple transactions after multiple charges', async () => {
      // Make multiple charges
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/payments/charge')
          .send({
            amount: 100 + i,
            currency: 'USD',
            source: 'tok_test',
            email: `user${i}@example.com`,
            ipCountry: 'US',
            billingCountry: 'US'
          })
          .expect(200);
      }

      // Check transactions endpoint
      return request(app.getHttpServer())
        .get('/api/payments/transactions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3);
        });
    }, 30000);
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation', () => {
      return request(app.getHttpServer())
        .get('/docs')
        .expect(200);
    });
  });
});
