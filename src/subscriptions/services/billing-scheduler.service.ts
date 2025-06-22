import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class BillingSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingSchedulerService.name);
  private billingInterval: NodeJS.Timeout | null = null;
  private readonly BILLING_INTERVAL_MS = 60000; // Run every minute for demo purposes

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Initialize the billing scheduler when the module starts.
   */
  onModuleInit() {
    this.logger.log('Initializing billing scheduler');
    this.startBillingScheduler();
  }

  /**
   * Clean up the billing scheduler when the module is destroyed.
   */
  onModuleDestroy() {
    this.logger.log('Stopping billing scheduler');
    this.stopBillingScheduler();
  }

  /**
   * Start the billing scheduler.
   */
  private startBillingScheduler(): void {
    this.logger.log(`Starting billing scheduler with ${this.BILLING_INTERVAL_MS}ms interval`);
    
    this.billingInterval = setInterval(async () => {
      await this.processDueSubscriptions();
    }, this.BILLING_INTERVAL_MS);

    // Process any immediately due subscriptions
    this.processDueSubscriptions();
  }

  /**
   * Stop the billing scheduler.
   */
  private stopBillingScheduler(): void {
    if (this.billingInterval) {
      clearInterval(this.billingInterval);
      this.billingInterval = null;
      this.logger.log('Billing scheduler stopped');
    }
  }

  /**
   * Process all subscriptions that are due for billing.
   */
  private async processDueSubscriptions(): Promise<void> {
    try {
      const dueSubscriptions = this.subscriptionsService.getSubscriptionsDueForBilling();
      
      if (dueSubscriptions.length === 0) {
        this.logger.debug('No subscriptions due for billing');
        return;
      }

      this.logger.log(`Processing ${dueSubscriptions.length} subscriptions due for billing`);

      // Process subscriptions in parallel with concurrency limit
      const concurrencyLimit = 5;
      const batches = this.chunkArray(dueSubscriptions, concurrencyLimit);

      for (const batch of batches) {
        await Promise.all(
          batch.map(subscription => this.processSubscriptionBilling(subscription))
        );
      }

      this.logger.log(`Completed processing ${dueSubscriptions.length} subscriptions`);
    } catch (error) {
      this.logger.error(`Error processing due subscriptions: ${error.message}`, error.stack);
    }
  }

  /**
   * Process billing for a single subscription.
   * @param subscription - Subscription to process
   */
  private async processSubscriptionBilling(subscription: any): Promise<void> {
    try {
      this.logger.debug(`Processing billing for subscription: ${subscription.donorId}`);

      // Process the billing
      const transaction = await this.subscriptionsService.processBilling(subscription);

      // Update billing schedule for next cycle
      this.subscriptionsService.updateBillingSchedule(subscription);

      this.logger.log(`Billing processed for ${subscription.donorId}`, {
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        provider: transaction.provider
      });
    } catch (error) {
      this.logger.error(`Error processing billing for ${subscription.donorId}: ${error.message}`, error.stack);
      
      // Mark as failed and update schedule to retry later
      subscription.failedCharges++;
      this.subscriptionsService.updateBillingSchedule(subscription);
    }
  }

  /**
   * Split array into chunks for batch processing.
   * @param array - Array to chunk
   * @param chunkSize - Size of each chunk
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Manually trigger billing processing (for testing).
   */
  async triggerBillingProcessing(): Promise<void> {
    this.logger.log('Manually triggering billing processing');
    await this.processDueSubscriptions();
  }

  /**
   * Get scheduler status.
   * @returns Scheduler status information
   */
  getSchedulerStatus() {
    return {
      isRunning: this.billingInterval !== null,
      intervalMs: this.BILLING_INTERVAL_MS,
      nextRun: this.billingInterval ? new Date(Date.now() + this.BILLING_INTERVAL_MS).toISOString() : null
    };
  }
} 