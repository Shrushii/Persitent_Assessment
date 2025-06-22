import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Unique donor identifier',
    example: 'abc123'
  })
  @IsString()
  @IsNotEmpty({ message: 'Donor ID is required' })
  donorId: string;

  @ApiProperty({
    description: 'Donation amount in cents',
    example: 1500,
    minimum: 1
  })
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD'
  })
  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  currency: string;

  @ApiProperty({
    description: 'Payment source token',
    example: 'tok_test'
  })
  @IsString()
  @IsNotEmpty({ message: 'Payment source is required' })
  source: string;

  @ApiProperty({
    description: 'Donor email address',
    example: 'donor@example.com'
  })
  @IsEmail({}, { message: 'Email must be valid' })
  email: string;

  @ApiProperty({
    description: 'Billing interval',
    example: 'monthly',
    enum: ['weekly', 'monthly', 'yearly']
  })
  @IsString()
  @IsIn(['weekly', 'monthly', 'yearly'], { message: 'Interval must be weekly, monthly, or yearly' })
  interval: 'weekly' | 'monthly' | 'yearly';

  @ApiProperty({
    description: 'Campaign description for LLM analysis',
    example: 'Emergency food and clean water for earthquake victims in Nepal'
  })
  @IsString()
  @IsNotEmpty({ message: 'Campaign description is required' })
  campaignDescription: string;
} 