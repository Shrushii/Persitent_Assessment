import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { ChargeDto } from '../dto/charge.dto';
import { Transaction } from '../entities/transaction.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Basic Heuristic Tests
  it('should increase risk for large amount', async () => {
    const dto: ChargeDto = { amount: 2000, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
    const tx = await service.charge(dto);
    expect(tx.riskScore).toBeGreaterThanOrEqual(0.5);
  });

  it('should increase risk for suspicious email', async () => {
    const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'a@test.com', ipCountry: 'US', billingCountry: 'US' };
    const tx = await service.charge(dto);
    expect(tx.riskScore).toBeGreaterThanOrEqual(0.4);
  });

  it('should block high risk transactions', async () => {
    // Force high risk by using both heuristics
    const dto: ChargeDto = { amount: 2000, currency: 'USD', source: 'tok', email: 'a@test.com', ipCountry: 'US', billingCountry: 'US' };
    // Run multiple times to ensure at least one is blocked
    let blocked = false;
    for (let i = 0; i < 10; i++) {
      const tx = await service.charge(dto);
      if (tx.status === 'blocked') blocked = true;
    }
    expect(blocked).toBe(true);
  });

  it('should log transactions in memory', async () => {
    const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
    await service.charge(dto);
    expect(service.getTransactions().length).toBeGreaterThan(0);
  });

  it('should increase risk for velocity (multiple charges in short time)', async () => {
    const dto: ChargeDto = {
      amount: 100,
      currency: 'USD',
      source: 'tok',
      email: 'velocity@example.com',
      ipCountry: 'US',
      billingCountry: 'US',
    };
    // Simulate 3 previous charges in the last hour
    for (let i = 0; i < 3; i++) {
      await service.charge(dto);
    }
    // 4th charge should trigger velocity heuristic
    const tx = await service.charge(dto);
    expect(tx.riskScore).toBeGreaterThanOrEqual(0.5);
    expect(tx.explanation).toBeDefined();
  });

  it('should increase risk for geolocation mismatch', async () => {
    const dto: ChargeDto = {
      amount: 100,
      currency: 'USD',
      source: 'tok',
      email: 'geo@example.com',
      ipCountry: 'CA',
      billingCountry: 'US',
    };
    const tx = await service.charge(dto);
    expect(tx.riskScore).toBeGreaterThanOrEqual(0.5);
    expect(tx.explanation).toBeDefined();
  });

  it('should block when all heuristics are triggered', async () => {
    // This triggers large amount, suspicious domain, velocity, and geo mismatch
    const dto: ChargeDto = {
      amount: 2000,
      currency: 'USD',
      source: 'tok',
      email: 'velocity@test.com',
      ipCountry: 'RU',
      billingCountry: 'US',
    };
    // Simulate 3 previous charges for velocity
    for (let i = 0; i < 3; i++) {
      await service.charge(dto);
    }
    // 4th charge triggers all heuristics
    const tx = await service.charge(dto);
    expect(tx.status).toBe('blocked');
    expect(tx.riskScore).toBe(1.0); // Risk is capped at 1.0
    expect(tx.explanation).toBeDefined();
  });

  // Edge Cases and Boundary Conditions
  describe('Edge Cases', () => {
    it('should handle minimum amount (0.01)', async () => {
      const dto: ChargeDto = { amount: 0.01, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.amount).toBe(0.01);
      expect(tx.riskScore).toBeLessThan(0.5); // Should be low risk
    });

    it('should handle very large amounts', async () => {
      const dto: ChargeDto = { amount: 999999, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeGreaterThanOrEqual(0.5); // Should trigger large amount heuristic
    });

    it('should handle exact threshold amount', async () => {
      const dto: ChargeDto = { amount: 1000, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      // Should not trigger large amount heuristic (amount = threshold, not > threshold)
      expect(tx.riskScore).toBeLessThan(0.5);
    });

    it('should handle amount just below threshold', async () => {
      const dto: ChargeDto = { amount: 999.99, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeLessThan(0.5); // Should not trigger large amount heuristic
    });

    it('should handle amount just above threshold', async () => {
      const dto: ChargeDto = { amount: 1000.01, currency: 'USD', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeGreaterThanOrEqual(0.5); // Should trigger large amount heuristic
    });

    it('should handle case-insensitive email domain matching', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'a@TEST.COM', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeGreaterThanOrEqual(0.4); // Should trigger suspicious domain heuristic
    });

    it('should handle email with subdomain', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'a@subdomain.test.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeGreaterThanOrEqual(0.4); // Should trigger suspicious domain heuristic
    });

    it('should handle email without suspicious domain', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'a@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeLessThan(0.4); // Should not trigger suspicious domain heuristic
    });

    it('should handle velocity threshold exactly', async () => {
      const dto: ChargeDto = {
        amount: 100,
        currency: 'USD',
        source: 'tok',
        email: 'exact@example.com',
        ipCountry: 'US',
        billingCountry: 'US',
      };
      // Simulate exactly 3 charges (threshold)
      for (let i = 0; i < 3; i++) {
        await service.charge(dto);
      }
      // 4th charge should trigger velocity heuristic
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle velocity just below threshold', async () => {
      const dto: ChargeDto = {
        amount: 100,
        currency: 'USD',
        source: 'tok',
        email: 'below@example.com',
        ipCountry: 'US',
        billingCountry: 'US',
      };
      // Simulate 2 charges (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        await service.charge(dto);
      }
      // 3rd charge should not trigger velocity heuristic
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeLessThan(0.5);
    });

    it('should handle same country for IP and billing', async () => {
      const dto: ChargeDto = {
        amount: 100,
        currency: 'USD',
        source: 'tok',
        email: 'same@example.com',
        ipCountry: 'US',
        billingCountry: 'US',
      };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeLessThan(0.5); // Should not trigger geo mismatch heuristic
    });

    it('should handle different countries for IP and billing', async () => {
      const dto: ChargeDto = {
        amount: 100,
        currency: 'USD',
        source: 'tok',
        email: 'different@example.com',
        ipCountry: 'CA',
        billingCountry: 'US',
      };
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBeGreaterThanOrEqual(0.5); // Should trigger geo mismatch heuristic
    });

    it('should handle risk score capping at 1.0', async () => {
      // Create a scenario that would exceed 1.0 risk score
      const dto: ChargeDto = {
        amount: 2000, // +0.5
        currency: 'USD',
        source: 'tok',
        email: 'fraud@test.com', // +0.4
        ipCountry: 'RU', // +0.4
        billingCountry: 'US',
      };
      // Add velocity by making multiple charges
      for (let i = 0; i < 5; i++) {
        await service.charge(dto);
      }
      const tx = await service.charge(dto);
      expect(tx.riskScore).toBe(1.0); // Should be capped at 1.0
    });

    it('should handle different currencies', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'EUR', source: 'tok', email: 'a@b.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.currency).toBe('EUR');
      expect(tx.amount).toBe(100);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: longEmail, ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.email).toBe(longEmail);
    });

    it('should handle special characters in email', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'user+tag@example.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      expect(tx.email).toBe('user+tag@example.com');
    });
  });

  // Cache Behavior Tests
  describe('LLM Cache Behavior', () => {
    it('should use cached explanation for identical scenarios', async () => {
      const dto: ChargeDto = { amount: 2000, currency: 'USD', source: 'tok', email: 'cache@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      
      // First call - should generate new explanation
      const tx1 = await service.charge(dto);
      const explanation1 = tx1.explanation;
      
      // Second call with same parameters - should use cache
      const tx2 = await service.charge(dto);
      const explanation2 = tx2.explanation;
      
      expect(explanation1).toBe(explanation2);
    });

    it('should generate different explanations for different scenarios', async () => {
      const dto1: ChargeDto = { amount: 2000, currency: 'USD', source: 'tok', email: 'cache1@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      const dto2: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'cache2@legitimate.com', ipCountry: 'CA', billingCountry: 'US' };
      
      const tx1 = await service.charge(dto1);
      const tx2 = await service.charge(dto2);
      
      expect(tx1.explanation).not.toBe(tx2.explanation);
    });
  });

  // Transaction Logging Tests
  describe('Transaction Logging', () => {
    it('should maintain transaction order', async () => {
      const dto1: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'order1@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      const dto2: ChargeDto = { amount: 200, currency: 'USD', source: 'tok', email: 'order2@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      
      const tx1 = await service.charge(dto1);
      const tx2 = await service.charge(dto2);
      
      const transactions = service.getTransactions();
      expect(transactions[transactions.length - 2].transactionId).toBe(tx1.transactionId);
      expect(transactions[transactions.length - 1].transactionId).toBe(tx2.transactionId);
    });

    it('should generate unique transaction IDs', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'unique@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      
      const tx1 = await service.charge(dto);
      const tx2 = await service.charge(dto);
      
      expect(tx1.transactionId).not.toBe(tx2.transactionId);
    });

    it('should include all required fields in transaction', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'fields@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      
      expect(tx).toHaveProperty('transactionId');
      expect(tx).toHaveProperty('provider');
      expect(tx).toHaveProperty('status');
      expect(tx).toHaveProperty('riskScore');
      expect(tx).toHaveProperty('explanation');
      expect(tx).toHaveProperty('timestamp');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('currency');
      expect(tx).toHaveProperty('email');
    });

    it('should format risk score to 2 decimal places', async () => {
      const dto: ChargeDto = { amount: 100, currency: 'USD', source: 'tok', email: 'format@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      const tx = await service.charge(dto);
      
      const riskScoreStr = tx.riskScore.toString();
      const decimalPlaces = riskScoreStr.split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  // Provider Selection Tests
  describe('Provider Selection', () => {
    it('should select either stripe or paypal for successful transactions', async () => {
      const dto: ChargeDto = { amount: 50, currency: 'USD', source: 'tok', email: 'provider@legitimate.com', ipCountry: 'US', billingCountry: 'US' };
      
      let stripeCount = 0;
      let paypalCount = 0;
      
      // Run multiple times to test both providers
      for (let i = 0; i < 20; i++) {
        const tx = await service.charge(dto);
        if (tx.status === 'success') {
          if (tx.provider === 'stripe') stripeCount++;
          if (tx.provider === 'paypal') paypalCount++;
        }
      }
      
      expect(stripeCount + paypalCount).toBeGreaterThan(0);
    });

    it('should have null provider for blocked transactions', async () => {
      const dto: ChargeDto = { amount: 2000, currency: 'USD', source: 'tok', email: 'blocked@test.com', ipCountry: 'RU', billingCountry: 'US' };
      
      let blockedFound = false;
      for (let i = 0; i < 10; i++) {
        const tx = await service.charge(dto);
        if (tx.status === 'blocked') {
          expect(tx.provider).toBeNull();
          blockedFound = true;
        }
      }
      expect(blockedFound).toBe(true);
    });
  });
});
