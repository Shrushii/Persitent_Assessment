import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from '../services/subscriptions.service';
import { BillingSchedulerService } from '../services/billing-scheduler.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let subscriptionsService: SubscriptionsService;
  let billingSchedulerService: BillingSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: {
            createSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            getAllSubscriptions: jest.fn(),
            getActiveSubscriptions: jest.fn(),
            getSubscription: jest.fn(),
            getDonationHistory: jest.fn(),
            getStatistics: jest.fn()
          }
        },
        {
          provide: BillingSchedulerService,
          useValue: {
            triggerBillingProcessing: jest.fn(),
            getSchedulerStatus: jest.fn()
          }
        }
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
    billingSchedulerService = module.get<BillingSchedulerService>(BillingSchedulerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      const expectedSubscription = {
        ...dto,
        tags: ['emergency relief', 'clean water', 'Nepal'],
        summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal.',
        status: 'active',
        createdAt: new Date().toISOString(),
        nextBillingAt: new Date().toISOString(),
        successfulCharges: 0,
        failedCharges: 0
      };

      jest.spyOn(subscriptionsService, 'createSubscription').mockResolvedValue(expectedSubscription as any);

      const result = await controller.createSubscription(dto);

      expect(result).toEqual(expectedSubscription);
      expect(subscriptionsService.createSubscription).toHaveBeenCalledWith(dto);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription successfully', async () => {
      const donorId = 'test123';
      const expectedSubscription = {
        donorId,
        status: 'cancelled',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign',
        tags: ['test'],
        summary: 'Test summary',
        createdAt: new Date().toISOString(),
        nextBillingAt: new Date().toISOString(),
        successfulCharges: 0,
        failedCharges: 0
      };

      jest.spyOn(subscriptionsService, 'cancelSubscription').mockResolvedValue(expectedSubscription as any);

      const result = await controller.cancelSubscription(donorId);

      expect(result).toEqual(expectedSubscription);
      expect(subscriptionsService.cancelSubscription).toHaveBeenCalledWith(donorId);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const expectedSubscriptions = [
        {
          donorId: 'sub1',
          status: 'active',
          amount: 1500,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor1@example.com',
          interval: 'monthly',
          campaignDescription: 'Test campaign 1',
          tags: ['test1'],
          summary: 'Test summary 1',
          createdAt: new Date().toISOString(),
          nextBillingAt: new Date().toISOString(),
          successfulCharges: 0,
          failedCharges: 0
        },
        {
          donorId: 'sub2',
          status: 'cancelled',
          amount: 2000,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor2@example.com',
          interval: 'weekly',
          campaignDescription: 'Test campaign 2',
          tags: ['test2'],
          summary: 'Test summary 2',
          createdAt: new Date().toISOString(),
          nextBillingAt: new Date().toISOString(),
          successfulCharges: 1,
          failedCharges: 0
        }
      ];

      jest.spyOn(subscriptionsService, 'getAllSubscriptions').mockReturnValue(expectedSubscriptions as any);

      const result = await controller.getAllSubscriptions();

      expect(result).toEqual(expectedSubscriptions);
      expect(subscriptionsService.getAllSubscriptions).toHaveBeenCalled();
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions', async () => {
      const expectedSubscriptions = [
        {
          donorId: 'sub1',
          status: 'active',
          amount: 1500,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor1@example.com',
          interval: 'monthly',
          campaignDescription: 'Test campaign 1',
          tags: ['test1'],
          summary: 'Test summary 1',
          createdAt: new Date().toISOString(),
          nextBillingAt: new Date().toISOString(),
          successfulCharges: 0,
          failedCharges: 0
        }
      ];

      jest.spyOn(subscriptionsService, 'getActiveSubscriptions').mockReturnValue(expectedSubscriptions as any);

      const result = await controller.getActiveSubscriptions();

      expect(result).toEqual(expectedSubscriptions);
      expect(subscriptionsService.getActiveSubscriptions).toHaveBeenCalled();
    });
  });

  describe('getSubscription', () => {
    it('should return a specific subscription', async () => {
      const donorId = 'test123';
      const expectedSubscription = {
        donorId,
        status: 'active',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Test campaign',
        tags: ['test'],
        summary: 'Test summary',
        createdAt: new Date().toISOString(),
        nextBillingAt: new Date().toISOString(),
        successfulCharges: 0,
        failedCharges: 0
      };

      jest.spyOn(subscriptionsService, 'getSubscription').mockReturnValue(expectedSubscription as any);

      const result = await controller.getSubscription(donorId);

      expect(result).toEqual(expectedSubscription);
      expect(subscriptionsService.getSubscription).toHaveBeenCalledWith(donorId);
    });

    it('should throw error if subscription not found', async () => {
      const donorId = 'nonexistent';

      jest.spyOn(subscriptionsService, 'getSubscription').mockReturnValue(null);

      await expect(controller.getSubscription(donorId)).rejects.toThrow(
        `Subscription not found for donor: ${donorId}`
      );
    });
  });

  describe('getDonationHistory', () => {
    it('should return donation history', async () => {
      const expectedHistory = [
        {
          transactionId: 'don_123',
          donorId: 'test123',
          amount: 1500,
          currency: 'USD',
          status: 'success',
          provider: 'stripe',
          timestamp: new Date().toISOString(),
          campaignDescription: 'Test campaign',
          tags: ['test'],
          summary: 'Test summary'
        }
      ];

      jest.spyOn(subscriptionsService, 'getDonationHistory').mockReturnValue(expectedHistory as any);

      const result = await controller.getDonationHistory();

      expect(result).toEqual(expectedHistory);
      expect(subscriptionsService.getDonationHistory).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return subscription statistics', async () => {
      const expectedStats = {
        totalSubscriptions: 2,
        activeSubscriptions: 1,
        cancelledSubscriptions: 1,
        totalMonthlyAmount: 1500,
        totalSuccessfulCharges: 5,
        totalFailedCharges: 1,
        successRate: '83.33%'
      };

      jest.spyOn(subscriptionsService, 'getStatistics').mockReturnValue(expectedStats);

      const result = await controller.getStatistics();

      expect(result).toEqual(expectedStats);
      expect(subscriptionsService.getStatistics).toHaveBeenCalled();
    });
  });

  describe('triggerBillingProcessing', () => {
    it('should trigger billing processing', async () => {
      jest.spyOn(billingSchedulerService, 'triggerBillingProcessing').mockResolvedValue();

      const result = await controller.triggerBillingProcessing();

      expect(result).toEqual({ message: 'Billing processing triggered successfully' });
      expect(billingSchedulerService.triggerBillingProcessing).toHaveBeenCalled();
    });
  });

  describe('getBillingStatus', () => {
    it('should return billing scheduler status', async () => {
      const expectedStatus = {
        isRunning: true,
        intervalMs: 60000,
        nextRun: new Date(Date.now() + 60000).toISOString()
      };

      jest.spyOn(billingSchedulerService, 'getSchedulerStatus').mockReturnValue(expectedStatus);

      const result = await controller.getBillingStatus();

      expect(result).toEqual(expectedStatus);
      expect(billingSchedulerService.getSchedulerStatus).toHaveBeenCalled();
    });
  });
}); 