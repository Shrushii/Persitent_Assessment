import { Body, Controller, Post, Get, HttpCode, HttpStatus, UsePipes, ValidationPipe, HttpException, Logger, Version } from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import { Transaction } from '../entities/transaction.entity';
import { ChargeDto } from '../dto/charge.dto';
import { 
  ApiBody, 
  ApiOkResponse, 
  ApiTags, 
  ApiResponse, 
  ApiOperation, 
  ApiParam, 
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';

/**
 * Payment Gateway Controller
 * 
 * Handles payment processing with advanced fraud detection and AI-powered explanations.
 * 
 * ## Features:
 * - **Fraud Detection**: 4-tier heuristic system (amount, domain, velocity, geolocation)
 * - **Risk Scoring**: Dynamic risk calculation with configurable thresholds
 * - **LLM Integration**: AI-generated explanations for transaction decisions
 * - **Provider Routing**: Automatic routing to Stripe or PayPal based on risk
 * - **Transaction Logging**: Complete audit trail of all processed transactions
 * 
 * ## Fraud Detection Heuristics:
 * 1. **Large Amount**: Transactions > $1000 get +0.3 risk score
 * 2. **Suspicious Domain**: Known fraud domains get +0.3 risk score
 * 3. **Velocity**: >3 charges/hour from same email get +0.25 risk score
 * 4. **Geolocation Mismatch**: IP ≠ Billing country get +0.2 risk score
 * 
 * ## Risk Thresholds:
 * - **Success**: Risk score < 0.5 (routed to payment provider)
 * - **Blocked**: Risk score ≥ 0.5 (transaction rejected)
 * 
 * ## Response Codes:
 * - **200**: Transaction processed successfully
 * - **403**: Transaction blocked due to high risk
 * - **400**: Invalid request data
 * - **500**: Internal server error
 */
@ApiTags('Payment Gateway')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Process Payment with Fraud Detection
   * 
   * Simulates a payment charge with comprehensive fraud detection, risk scoring,
   * and AI-powered explanations. Uses 4-tier heuristic system to evaluate risk.
   * 
   * ## Process Flow:
   * 1. **Input Validation**: Validates request data using class-validator
   * 2. **Fraud Detection**: Applies 4 heuristics to calculate risk score
   * 3. **Risk Assessment**: Compares risk score against threshold (0.5)
   * 4. **Provider Routing**: Routes to Stripe/PayPal or blocks transaction
   * 5. **LLM Explanation**: Generates AI explanation for the decision
   * 6. **Transaction Logging**: Stores complete transaction record
   * 
   * ## Fraud Heuristics Applied:
   * - **Amount Check**: Large amounts (>$1000) increase risk
   * - **Domain Check**: Suspicious email domains trigger alerts
   * - **Velocity Check**: Multiple charges from same email in 1 hour
   * - **Geolocation Check**: IP country vs billing country mismatch
   * 
   * ## Success Response:
   * Returns transaction details with provider routing and explanation
   * 
   * ## Blocked Response (403):
   * Returns detailed explanation of why transaction was blocked
   */
  @Version('1')
  @Post('charge')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Process payment with fraud detection',
    description: `
Processes a payment with advanced fraud detection and AI-powered explanations.

**Fraud Detection Features:**
- 4-tier heuristic system (amount, domain, velocity, geolocation)
- Dynamic risk scoring with configurable thresholds
- AI-generated explanations for all decisions
- Automatic provider routing (Stripe/PayPal)

**Risk Assessment:**
- Success: Risk score < 0.5 (routed to payment provider)
- Blocked: Risk score ≥ 0.5 (transaction rejected)

**Heuristics Applied:**
1. **Large Amount**: >$1000 = +0.3 risk
2. **Suspicious Domain**: Known fraud domains = +0.3 risk
3. **Velocity**: >3 charges/hour = +0.25 risk
4. **Geolocation**: IP ≠ Billing country = +0.2 risk

**Response Codes:**
- 200: Transaction processed successfully
- 403: Transaction blocked due to high risk
- 400: Invalid request data
    `
  })
  @ApiBody({
    type: ChargeDto,
    description: 'Payment charge request with fraud detection parameters',
    examples: {
      valid: {
        summary: '✅ Valid request - Low risk, will be approved',
        description: 'Normal payment with low risk score, will be routed to payment provider',
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
        summary: '🚨 High risk - Multiple heuristics triggered',
        description: 'Triggers multiple fraud heuristics, likely to be blocked',
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
        summary: '✅ Normal request - No heuristics triggered',
        description: 'Standard payment with no risk factors, will be approved',
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
        summary: '⚠️ Large amount heuristic triggered',
        description: 'Amount > $1000 triggers large amount risk (+0.3)',
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
        summary: '⚠️ Suspicious domain heuristic triggered',
        description: 'Email domain in blacklist triggers domain risk (+0.3)',
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
        summary: '⚠️ Velocity heuristic triggered',
        description: 'Multiple charges from same email in 1 hour (+0.25 risk)',
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
        summary: '⚠️ Geolocation mismatch heuristic triggered',
        description: 'IP country differs from billing country (+0.2 risk)',
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
        summary: '🚨 All heuristics triggered - Will be blocked',
        description: 'Combines all risk factors, guaranteed to be blocked',
        value: {
          amount: 2000,
          currency: 'USD',
          source: 'tok_test',
          email: 'velocity@test.com',
          ipCountry: 'RU',
          billingCountry: 'US',
        },
      },
      minimumAmount: {
        summary: '✅ Minimum amount test',
        description: 'Tests minimum allowed amount (0.01)',
        value: {
          amount: 0.01,
          currency: 'USD',
          source: 'tok_test',
          email: 'minimal@example.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      maximumAmount: {
        summary: '⚠️ Maximum amount test',
        description: 'Tests maximum amount (999999) - likely to be blocked',
        value: {
          amount: 999999,
          currency: 'USD',
          source: 'tok_test',
          email: 'maximum@example.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      differentCurrency: {
        summary: '✅ Different currency test',
        description: 'Tests EUR currency support',
        value: {
          amount: 100,
          currency: 'EUR',
          source: 'tok_test',
          email: 'european@example.com',
          ipCountry: 'DE',
          billingCountry: 'DE',
        },
      },
      disposableEmail: {
        summary: '⚠️ Disposable email test',
        description: 'Tests disposable email domain detection',
        value: {
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@10minutemail.com',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
      caseInsensitiveEmail: {
        summary: '⚠️ Case insensitive email test',
        description: 'Tests case-insensitive domain matching',
        value: {
          amount: 100,
          currency: 'USD',
          source: 'tok_test',
          email: 'user@TEST.COM',
          ipCountry: 'US',
          billingCountry: 'US',
        },
      },
    },
  })
  @ApiOkResponse({
    description: '✅ Payment processed successfully - Transaction routed to payment provider',
    schema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', example: 'txn_abc123' },
        provider: { type: 'string', example: 'stripe', description: 'Payment provider (stripe/paypal)' },
        status: { type: 'string', example: 'success', description: 'Transaction status' },
        riskScore: { type: 'number', example: 0.25, description: 'Calculated risk score (0-1)' },
        explanation: { type: 'string', description: 'AI-generated explanation for the decision' },
        timestamp: { type: 'string', format: 'date-time' },
        amount: { type: 'number', example: 1000 },
        currency: { type: 'string', example: 'USD' },
        email: { type: 'string', example: 'user@example.com' }
      },
      example: {
        transactionId: 'txn_abc123',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.25,
        explanation: 'Payment routed to Stripe due to low risk score. No suspicious patterns detected.',
        timestamp: '2024-01-15T10:30:00Z',
        amount: 1000,
        currency: 'USD',
        email: 'donor@example.com',
      },
    },
  })
  @ApiForbiddenResponse({
    description: '🚨 Payment blocked due to high risk score',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 403 },
        message: { type: 'string', description: 'AI-generated explanation for blocking' },
        riskScore: { type: 'number', example: 0.85, description: 'Risk score that triggered blocking' }
      },
      example: {
        status: 403,
        message: 'Payment blocked due to large amount, suspicious email domain, and geolocation mismatch.',
        riskScore: 0.85
      }
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Invalid request data - Validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiInternalServerErrorResponse({
    description: '❌ Internal server error - Service unavailable'
  })
  async charge(@Body() chargeDto: ChargeDto): Promise<Transaction> {
    this.logger.log(`Processing payment charge request`, {
      amount: chargeDto.amount,
      currency: chargeDto.currency,
      email: chargeDto.email,
      ipCountry: chargeDto.ipCountry,
      billingCountry: chargeDto.billingCountry
    });

    // Input validation is handled by class-validator
    const transaction = await this.paymentsService.charge(chargeDto);
    
    if (transaction.status === 'blocked') {
      this.logger.warn(`Payment blocked due to high risk`, {
        transactionId: transaction.transactionId,
        riskScore: transaction.riskScore,
        explanation: transaction.explanation
      });

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

    this.logger.log(`Payment processed successfully`, {
      transactionId: transaction.transactionId,
      provider: transaction.provider,
      riskScore: transaction.riskScore
    });

    return transaction;
  }

  /**
   * Get All Transactions
   * 
   * Retrieves the complete audit trail of all processed transactions.
   * Returns both successful and blocked transactions with full details.
   * 
   * ## Response Includes:
   * - **Transaction ID**: Unique identifier for each transaction
   * - **Provider**: Payment provider used (stripe/paypal/null for blocked)
   * - **Status**: Transaction outcome (success/blocked)
   * - **Risk Score**: Calculated fraud risk (0-1 scale)
   * - **Explanation**: AI-generated reason for the decision
   * - **Full Details**: Amount, currency, email, timestamp
   * 
   * ## Use Cases:
   * - **Audit Trail**: Complete transaction history
   * - **Fraud Analysis**: Review blocked transactions
   * - **Performance Monitoring**: Track success rates
   * - **Debugging**: Investigate specific transactions
   */
  @Version('1')
  @Get('transactions')
  @ApiOperation({
    summary: 'Get all processed transactions',
    description: `
Retrieves the complete audit trail of all processed transactions.

**Response Includes:**
- Transaction ID and status
- Payment provider used (stripe/paypal)
- Risk score and AI explanation
- Full transaction details (amount, currency, email, timestamp)

**Use Cases:**
- Audit trail and compliance
- Fraud analysis and investigation
- Performance monitoring
- Debugging and troubleshooting

**Data Source:** In-memory transaction log (resets on application restart)
    `
  })
  @ApiOkResponse({
    description: '📋 Complete list of all processed transactions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', example: 'txn_abc123' },
          provider: { type: 'string', example: 'stripe', nullable: true },
          status: { type: 'string', example: 'success' },
          riskScore: { type: 'number', example: 0.25 },
          explanation: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          amount: { type: 'number', example: 1000 },
          currency: { type: 'string', example: 'USD' },
          email: { type: 'string', example: 'user@example.com' }
        }
      },
      example: [
        {
          transactionId: 'txn_abc123',
          provider: 'stripe',
          status: 'success',
          riskScore: 0.25,
          explanation: 'Payment routed to Stripe due to low risk score.',
          timestamp: '2024-01-15T10:30:00Z',
          amount: 1000,
          currency: 'USD',
          email: 'donor@example.com',
        },
        {
          transactionId: 'txn_def456',
          provider: 'paypal',
          status: 'success',
          riskScore: 0.15,
          explanation: 'Payment processed successfully with minimal risk.',
          timestamp: '2024-01-15T10:35:00Z',
          amount: 100,
          currency: 'USD',
          email: 'user@example.com',
        },
        {
          transactionId: 'txn_ghi789',
          provider: null,
          status: 'blocked',
          riskScore: 0.85,
          explanation: 'Payment blocked due to large amount, suspicious email domain, and geolocation mismatch.',
          timestamp: '2024-01-15T10:36:15Z',
          amount: 2000,
          currency: 'USD',
          email: 'fraud@test.com',
        },
        {
          transactionId: 'txn_jkl012',
          provider: 'paypal',
          status: 'success',
          riskScore: 0.30,
          explanation: 'Payment processed successfully with moderate risk score.',
          timestamp: '2024-01-15T10:37:30Z',
          amount: 500,
          currency: 'EUR',
          email: 'european@example.com',
        }
      ],
    },
  })
  getTransactions(): Transaction[] {
    this.logger.debug('Retrieving all transactions from audit log');
    const transactions = this.paymentsService.getTransactions();
    this.logger.log(`Retrieved ${transactions.length} transactions from audit log`);
    return transactions;
  }
}
