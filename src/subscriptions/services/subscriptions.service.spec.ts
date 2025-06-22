import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { LLMService } from './llm.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { DonationTransaction } from '../entities/donation-transaction.entity';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let llmService: LLMService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: LLMService,
          useValue: {
            analyzeCampaign: jest.fn().mockResolvedValue({
              tags: ['emergency relief', 'clean water', 'Nepal'],
              summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal.'
            })
          }
        }
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    llmService = module.get<LLMService>(LLMService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'test123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal'
      };

      const subscription = await service.createSubscription(dto);

      expect(subscription).toBeDefined();
      expect(subscription.donorId).toBe('test123');
      expect(subscription.amount).toBe(1500);
      expect(subscription.currency).toBe('USD');
      expect(subscription.interval).toBe('monthly');
      expect(subscription.status).toBe('active');
      expect(subscription.tags).toEqual(['emergency relief', 'clean water', 'Nepal']);
      expect(subscription.summary).toBe('This campaign provides emergency aid to earthquake-affected communities in Nepal.');
      expect(subscription.successfulCharges).toBe(0);
      expect(subscription.failedCharges).toBe(0);
      expect(subscription.createdAt).toBeDefined();
      expect(subscription.nextBillingAt).toBeDefined();
    });

    it('should throw error if subscription already exists', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'duplicate123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      // Create first subscription
      await service.createSubscription(dto);

      // Try to create duplicate
      await expect(service.createSubscription(dto)).rejects.toThrow(
        'Subscription already exists for donor: duplicate123'
      );
    });

    it('should call LLM service for campaign analysis', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'llm123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign for LLM analysis'
      };

      await service.createSubscription(dto);

      expect(llmService.analyzeCampaign).toHaveBeenCalledWith('Test campaign for LLM analysis');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel an active subscription', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'cancel123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      // Create subscription
      await service.createSubscription(dto);

      // Cancel subscription
      const cancelledSubscription = await service.cancelSubscription('cancel123');

      expect(cancelledSubscription.status).toBe('cancelled');
    });

    it('should throw error if subscription not found', async () => {
      await expect(service.cancelSubscription('nonexistent')).rejects.toThrow(
        'Subscription not found for donor: nonexistent'
      );
    });

    it('should throw error if subscription already cancelled', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'alreadyCancelled123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      // Create and cancel subscription
      await service.createSubscription(dto);
      await service.cancelSubscription('alreadyCancelled123');

      // Try to cancel again
      await expect(service.cancelSubscription('alreadyCancelled123')).rejects.toThrow(
        'Subscription already cancelled for donor: alreadyCancelled123'
      );
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions', async () => {
      const dto1: CreateSubscriptionDto = {
        donorId: 'active1',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor1@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign 1'
      };

      const dto2: CreateSubscriptionDto = {
        donorId: 'active2',
        amount: 2000,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor2@example.com',
        interval: 'weekly',
        campaignDescription: 'Test campaign 2'
      };

      // Create subscriptions
      await service.createSubscription(dto1);
      await service.createSubscription(dto2);

      // Cancel one subscription
      await service.cancelSubscription('active1');

      const activeSubscriptions = service.getActiveSubscriptions();

      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].donorId).toBe('active2');
      expect(activeSubscriptions[0].status).toBe('active');
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const dto1: CreateSubscriptionDto = {
        donorId: 'all1',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor1@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign 1'
      };

      const dto2: CreateSubscriptionDto = {
        donorId: 'all2',
        amount: 2000,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor2@example.com',
        interval: 'weekly',
        campaignDescription: 'Test campaign 2'
      };

      // Create subscriptions
      await service.createSubscription(dto1);
      await service.createSubscription(dto2);

      // Cancel one subscription
      await service.cancelSubscription('all1');

      const allSubscriptions = service.getAllSubscriptions();

      expect(allSubscriptions).toHaveLength(2);
      expect(allSubscriptions[0].donorId).toBe('all1');
      expect(allSubscriptions[0].status).toBe('cancelled');
      expect(allSubscriptions[1].donorId).toBe('all2');
      expect(allSubscriptions[1].status).toBe('active');
    });
  });

  describe('getDonationHistory', () => {
    it('should return empty array initially', () => {
      const history = service.getDonationHistory();
      expect(history).toEqual([]);
    });

    it('should return transactions after processing billing', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'history123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      await service.processBilling(subscription);

      const history = service.getDonationHistory();

      expect(history).toHaveLength(1);
      expect(history[0].donorId).toBe('history123');
      expect(history[0].amount).toBe(1500);
      expect(history[0].currency).toBe('USD');
      expect(history[0].transactionId).toMatch(/^don_/);
      expect(history[0].timestamp).toBeDefined();
    });
  });

  describe('processBilling', () => {
    it('should process billing successfully', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'billing123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      const transaction = await service.processBilling(subscription);

      expect(transaction).toBeDefined();
      expect(transaction.donorId).toBe('billing123');
      expect(transaction.amount).toBe(1500);
      expect(transaction.currency).toBe('USD');
      expect(transaction.status).toMatch(/^(success|failed)$/);
      expect(transaction.provider).toMatch(/^(stripe|paypal|unknown)$/);
      expect(transaction.transactionId).toMatch(/^don_/);
      expect(transaction.timestamp).toBeDefined();
    });

    it('should update subscription stats after billing', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'stats123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      
      // Process multiple billings
      await service.processBilling(subscription);
      await service.processBilling(subscription);
      await service.processBilling(subscription);

      const updatedSubscription = service.getSubscription('stats123');
      expect((updatedSubscription?.successfulCharges || 0) + (updatedSubscription?.failedCharges || 0)).toBe(3);
    });
  });

  describe('getSubscriptionsDueForBilling', () => {
    it('should return subscriptions due for billing', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'due123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      
      // Manually set next billing to past date
      subscription.nextBillingAt = new Date(Date.now() - 1000).toISOString();

      const dueSubscriptions = service.getSubscriptionsDueForBilling();
      expect(dueSubscriptions).toHaveLength(1);
      expect(dueSubscriptions[0].donorId).toBe('due123');
    });

    it('should not return cancelled subscriptions', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'cancelled123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      
      // Cancel subscription
      await service.cancelSubscription('cancelled123');
      
      // Set next billing to past date
      subscription.nextBillingAt = new Date(Date.now() - 1000).toISOString();

      const dueSubscriptions = service.getSubscriptionsDueForBilling();
      expect(dueSubscriptions).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const dto1: CreateSubscriptionDto = {
        donorId: 'stats1',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor1@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign 1'
      };

      const dto2: CreateSubscriptionDto = {
        donorId: 'stats2',
        amount: 2000,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor2@example.com',
        interval: 'weekly',
        campaignDescription: 'Test campaign 2'
      };

      // Create subscriptions
      await service.createSubscription(dto1);
      await service.createSubscription(dto2);

      // Cancel one subscription
      await service.cancelSubscription('stats1');

      const stats = service.getStatistics();

      expect(stats.totalSubscriptions).toBe(2);
      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.cancelledSubscriptions).toBe(1);
      expect(stats.totalMonthlyAmount).toBe(2000); // Only active subscription
      expect(stats.totalSuccessfulCharges).toBe(0);
      expect(stats.totalFailedCharges).toBe(0);
      expect(stats.successRate).toBe('0%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle different intervals correctly', async () => {
      const weeklyDto: CreateSubscriptionDto = {
        donorId: 'weekly123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'weekly',
        campaignDescription: 'Test campaign'
      };

      const monthlyDto: CreateSubscriptionDto = {
        donorId: 'monthly123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const yearlyDto: CreateSubscriptionDto = {
        donorId: 'yearly123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'yearly',
        campaignDescription: 'Test campaign'
      };

      const weeklySub = await service.createSubscription(weeklyDto);
      const monthlySub = await service.createSubscription(monthlyDto);
      const yearlySub = await service.createSubscription(yearlyDto);

      expect(weeklySub.interval).toBe('weekly');
      expect(monthlySub.interval).toBe('monthly');
      expect(yearlySub.interval).toBe('yearly');
    });

    it('should handle minimum amount', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'min123',
        amount: 1,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      expect(subscription.amount).toBe(1);
    });

    it('should handle large amounts', async () => {
      const dto: CreateSubscriptionDto = {
        donorId: 'large123',
        amount: 999999,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign'
      };

      const subscription = await service.createSubscription(dto);
      expect(subscription.amount).toBe(999999);
    });
  });
}); 