import { Test, TestingModule } from '@nestjs/testing';
import { BillingSchedulerService } from './billing-scheduler.service';
import { SubscriptionsService } from './subscriptions.service';

describe('BillingSchedulerService', () => {
  let service: BillingSchedulerService;
  let subscriptionsService: SubscriptionsService;

  const mockSubscriptionsService = {
    getSubscriptionsDueForBilling: jest.fn().mockReturnValue([]),
    processBilling: jest.fn().mockResolvedValue({ transactionId: 'don_123', status: 'success' }),
    updateBillingSchedule: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingSchedulerService,
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService
        }
      ],
    }).compile();

    service = module.get<BillingSchedulerService>(BillingSchedulerService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);

    // Prevent automatic initialization
    jest.spyOn(service as any, 'startBillingScheduler').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize billing scheduler', () => {
      jest.restoreAllMocks();
      const startSpy = jest.spyOn(service as any, 'startBillingScheduler');
      
      service.onModuleInit();
      
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop billing scheduler', () => {
      const stopSpy = jest.spyOn(service as any, 'stopBillingScheduler');
      
      service.onModuleDestroy();
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('triggerBillingProcessing', () => {
    it('should trigger billing processing manually', async () => {
      const processSpy = jest.spyOn(service as any, 'processDueSubscriptions');
      
      await service.triggerBillingProcessing();
      
      expect(processSpy).toHaveBeenCalled();
    });
  });

  describe('getSchedulerStatus', () => {
    it('should return scheduler status', () => {
      const status = service.getSchedulerStatus();
      
      expect(status).toBeDefined();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('intervalMs');
      expect(status).toHaveProperty('nextRun');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.intervalMs).toBe('number');
    });
  });

  describe('processDueSubscriptions', () => {
    it('should process subscriptions due for billing', async () => {
      const mockSubscriptions = [
        { donorId: 'sub1', amount: 1500 },
        { donorId: 'sub2', amount: 2000 }
      ];

      mockSubscriptionsService.getSubscriptionsDueForBilling.mockReturnValue(mockSubscriptions);
      mockSubscriptionsService.processBilling.mockResolvedValue({ transactionId: 'don_123', status: 'success' });

      await (service as any).processDueSubscriptions();

      expect(mockSubscriptionsService.getSubscriptionsDueForBilling).toHaveBeenCalled();
      expect(mockSubscriptionsService.processBilling).toHaveBeenCalledTimes(2);
      expect(mockSubscriptionsService.updateBillingSchedule).toHaveBeenCalledTimes(2);
    });

    it('should handle empty due subscriptions', async () => {
      mockSubscriptionsService.getSubscriptionsDueForBilling.mockReturnValue([]);

      await (service as any).processDueSubscriptions();

      expect(mockSubscriptionsService.getSubscriptionsDueForBilling).toHaveBeenCalled();
      expect(mockSubscriptionsService.processBilling).not.toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      const mockSubscriptions = [
        { donorId: 'sub1', amount: 1500 }
      ];

      mockSubscriptionsService.getSubscriptionsDueForBilling.mockReturnValue(mockSubscriptions);
      mockSubscriptionsService.processBilling.mockRejectedValue(new Error('Processing failed'));

      await expect((service as any).processDueSubscriptions()).resolves.not.toThrow();
    });
  });

  describe('processSubscriptionBilling', () => {
    it('should process single subscription billing successfully', async () => {
      const mockSubscription = { donorId: 'sub1', amount: 1500 };
      const mockTransaction = { transactionId: 'don_123', status: 'success' };

      mockSubscriptionsService.processBilling.mockResolvedValue(mockTransaction);

      await (service as any).processSubscriptionBilling(mockSubscription);

      expect(mockSubscriptionsService.processBilling).toHaveBeenCalledWith(mockSubscription);
      expect(mockSubscriptionsService.updateBillingSchedule).toHaveBeenCalledWith(mockSubscription);
    });

    it('should handle billing processing errors', async () => {
      const mockSubscription = { donorId: 'sub1', amount: 1500, failedCharges: 0 };

      mockSubscriptionsService.processBilling.mockRejectedValue(new Error('Billing failed'));

      await (service as any).processSubscriptionBilling(mockSubscription);

      expect(mockSubscription.failedCharges).toBe(1);
      expect(mockSubscriptionsService.updateBillingSchedule).toHaveBeenCalledWith(mockSubscription);
    });
  });

  describe('chunkArray', () => {
    it('should split array into chunks correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunkSize = 3;

      const chunks = (service as any).chunkArray(array, chunkSize);

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it('should handle empty array', () => {
      const array: number[] = [];
      const chunkSize = 3;

      const chunks = (service as any).chunkArray(array, chunkSize);

      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const array = [1, 2, 3];
      const chunkSize = 5;

      const chunks = (service as any).chunkArray(array, chunkSize);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });
  });

  describe('startBillingScheduler', () => {
    it('should start billing scheduler with interval', () => {
      // Restore the original method for this test
      jest.restoreAllMocks();
      
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(123 as any);
      const processSpy = jest.spyOn(service as any, 'processDueSubscriptions');

      (service as any).startBillingScheduler();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
      expect(processSpy).toHaveBeenCalled();
    });
  });

  describe('stopBillingScheduler', () => {
    it('should stop billing scheduler', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
      
      (service as any).billingInterval = 123;

      (service as any).stopBillingScheduler();

      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect((service as any).billingInterval).toBeNull();
    });

    it('should handle stopping when no interval is set', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
      
      (service as any).billingInterval = null;

      (service as any).stopBillingScheduler();

      expect(clearIntervalSpy).not.toHaveBeenCalled();
      expect((service as any).billingInterval).toBeNull();
    });
  });
}); 