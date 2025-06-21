import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ChargeDto {
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsEmail({}, { message: 'Email must be valid' })
  email: string;

  @IsString()
  @IsNotEmpty()
  ipCountry: string; // Country code derived from user's IP address

  @IsString()
  @IsNotEmpty()
  billingCountry: string; // Country code from billing address
} 