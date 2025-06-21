import { Body, Controller, Post, Get, HttpCode, HttpStatus, UsePipes, ValidationPipe, HttpException } from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import { Transaction } from '../entities/transaction.entity';
import { ChargeDto } from '../dto/charge.dto';
import { ApiBody, ApiOkResponse, ApiTags, ApiResponse } from '@nestjs/swagger';

// PaymentsController handles payment-related API endpoints
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/charge
   * Simulate a payment charge with fraud scoring, routing, and LLM explanation.
   * Returns 403 if blocked due to high risk.
   */
  @Post('charge')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiBody({
    type: ChargeDto,
    examples: {
      valid: {
        summary: 'Valid request',
        value: {
          amount: 1000,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor@example.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      suspicious: {
        summary: 'Suspicious email, large amount, velocity, and geolocation mismatch',
        value: {
          amount: 2000,
          currency: 'USD',
          source: 'tok_test',
          email: 'fraud@test.com',
          ipCountry: 'RU',
          billingCountry: 'US',
        },
      },
      normal: {
        summary: 'Normal request (no heuristics triggered)',
        value: {
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@example.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      largeAmount: {
        summary: 'Triggers large amount heuristic',
        value: {
          amount: 2000,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@example.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      suspiciousDomain: {
        summary: 'Triggers suspicious domain heuristic',
        value: {
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@test.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      velocity: {
        summary: 'Triggers velocity heuristic (simulate by sending 3+ requests with same email in 1 hour)',
        value: {
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'velocity@example.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      geoMismatch: {
        summary: 'Triggers geolocation mismatch heuristic',
        value: {
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@example.com',
          ipCountry: 'CA',
          billingCountry: 'US',
        },
      },
      allHeuristics: {
        summary: 'Triggers all heuristics (blocked)',
        value: {
          amount: 2000,
          currency: 'USD',
          source: 'tok_test',
          email: 'velocity@test.com',
          ipCountry: 'RU',
          billingCountry: 'US',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Transaction response',
    schema: {
      example: {
        transactionId: 'txn_abc123',
        provider: 'paypal',
        status: 'success',
        riskScore: 0.32,
        explanation: 'This payment was blocked due to a large amount, suspicious email domain, multiple charges in short time, and geolocation mismatch.',
        timestamp: '2024-06-18T12:34:56.789Z',
        amount: 1000,
        currency: 'USD',
        email: 'donor@example.com',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Transaction blocked due to high risk' })
  async charge(@Body() chargeDto: ChargeDto): Promise<Transaction> {
    // Input validation is handled by class-validator
    const transaction = await this.paymentsService.charge(chargeDto);
    if (transaction.status === 'blocked') {
      // Return 403 for blocked transactions with LLM explanation
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: transaction.explanation,
          riskScore: transaction.riskScore,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return transaction;
  }

  /**
   * GET /payments/transactions
   * Returns all transactions processed so far (in-memory log).
   */
  @Get('transactions')
  @ApiOkResponse({
    description: 'List of all transactions so far',
    schema: {
      example: [
        {
          transactionId: 'txn_abc123',
          provider: 'paypal',
          status: 'success',
          riskScore: 0.32,
          explanation: 'This payment was blocked due to a large amount, suspicious email domain, multiple charges in short time, and geolocation mismatch.',
          timestamp: '2024-06-18T12:34:56.789Z',
          amount: 1000,
          currency: 'USD',
          email: 'donor@example.com',
        },
      ],
    },
  })
  getTransactions(): Transaction[] {
    return this.paymentsService.getTransactions();
  }
}
