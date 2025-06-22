import { ApiProperty } from '@nestjs/swagger';

/**
 * Donation transaction entity for in-memory storage and API responses.
 */
export class DonationTransaction {
  @ApiProperty({
    description: 'Unique transaction ID',
    example: 'don_abc123'
  })
  transactionId: string;

  @ApiProperty({
    description: 'Associated donor ID',
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
    description: 'Transaction status',
    example: 'success',
    enum: ['success', 'failed']
  })
  status: 'success' | 'failed';

  @ApiProperty({
    description: 'Payment provider used',
    example: 'stripe'
  })
  provider: string;

  @ApiProperty({
    description: 'Error message if failed',
    example: 'Payment processing failed',
    required: false
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'ISO timestamp of transaction',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Campaign description',
    example: 'Emergency food and clean water for earthquake victims in Nepal'
  })
  campaignDescription: string;

  @ApiProperty({
    description: 'Campaign tags',
    example: ['emergency relief', 'clean water', 'Nepal']
  })
  tags: string[];

  @ApiProperty({
    description: 'Campaign summary',
    example: 'This campaign provides emergency aid to earthquake-affected communities in Nepal.'
  })
  summary: string;
} 