import { ApiProperty } from '@nestjs/swagger';

/**
 * Subscription entity for in-memory storage and API responses.
 */
export class Subscription {
  @ApiProperty({
    description: 'Unique donor identifier',
    example: 'abc123'
  })
  donorId: string;

  @ApiProperty({
    description: 'Donation amount in cents',
    example: 1500
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD'
  })
  currency: string;

  @ApiProperty({
    description: 'Payment source token',
    example: 'tok_test'
  })
  source: string;

  @ApiProperty({
    description: 'Donor email address',
    example: 'donor@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'Billing interval',
    example: 'monthly',
    enum: ['weekly', 'monthly', 'yearly']
  })
  interval: 'weekly' | 'monthly' | 'yearly';

  @ApiProperty({
    description: 'Campaign description',
    example: 'Emergency food and clean water for earthquake victims in Nepal'
  })
  campaignDescription: string;

  @ApiProperty({
    description: 'LLM-generated campaign tags',
    example: ['emergency relief', 'clean water', 'Nepal']
  })
  tags: string[];

  @ApiProperty({
    description: 'LLM-generated campaign summary',
    example: 'This campaign provides emergency aid to earthquake-affected communities in Nepal.'
  })
  summary: string;

  @ApiProperty({
    description: 'Subscription status',
    example: 'active',
    enum: ['active', 'cancelled']
  })
  status: 'active' | 'cancelled';

  @ApiProperty({
    description: 'ISO timestamp of subscription creation',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'ISO timestamp of last billing',
    example: '2024-01-15T10:30:00Z',
    required: false
  })
  lastBilledAt?: string;

  @ApiProperty({
    description: 'ISO timestamp of next billing',
    example: '2024-02-15T10:30:00Z'
  })
  nextBillingAt: string;

  @ApiProperty({
    description: 'Total number of successful charges',
    example: 2
  })
  successfulCharges: number;

  @ApiProperty({
    description: 'Total number of failed charges',
    example: 0
  })
  failedCharges: number;
} 