import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { DonationTransaction } from '../entities/donation-transaction.entity';
import { LLMService } from './llm.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  
  // In-memory storage
  private subscriptions: Map<string, Subscription> = new Map();
  private transactions: DonationTransaction[] = [];

  constructor(private readonly llmService: LLMService) {}

  /**
   * Create a new subscription with LLM campaign analysis.
   * @param createSubscriptionDto - Subscription creation data
   * @returns Created subscription
   */
  async createSubscription(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    const { donorId, campaignDescription } = createSubscriptionDto;
    
    this.logger.log(`Creating subscription for donor: ${donorId}`, {
      amount: createSubscriptionDto.amount,
      currency: createSubscriptionDto.currency,
      interval: createSubscriptionDto.interval,
      email: createSubscriptionDto.email
    });

    // Check if subscription already exists
    if (this.subscriptions.has(donorId)) {
      throw new BadRequestException(`Subscription already exists for donor: ${donorId}`);
    }

    // Generate LLM analysis for campaign
    this.logger.log('Generating LLM analysis for campaign');
    const llmAnalysis = await this.llmService.analyzeCampaign(campaignDescription);
    
    // Calculate next billing date
    const now = new Date();
    const nextBillingAt = this.calculateNextBillingDate(now, createSubscriptionDto.interval);

    // Create subscription
    const subscription = new Subscription();
    Object.assign(subscription, {
      ...createSubscriptionDto,
      tags: llmAnalysis.tags,
      summary: llmAnalysis.summary,
      status: 'active',
      createdAt: now.toISOString(),
      nextBillingAt: nextBillingAt.toISOString(),
      successfulCharges: 0,
      failedCharges: 0
    });

    // Store subscription
    this.subscriptions.set(donorId, subscription);

    this.logger.log(`Subscription created successfully: ${donorId}`, {
      donorId: subscription.donorId,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval,
      tags: subscription.tags,
      nextBillingAt: subscription.nextBillingAt,
      totalSubscriptions: this.subscriptions.size
    });

    return subscription;
  }

  /**
   * Cancel a subscription.
   * @param donorId - Donor identifier
   * @returns Cancelled subscription
   */
  async cancelSubscription(donorId: string): Promise<Subscription> {
    this.logger.log(`Cancelling subscription for donor: ${donorId}`);

    const subscription = this.subscriptions.get(donorId);
    if (!subscription) {
      throw new NotFoundException(`Subscription not found for donor: ${donorId}`);
    }

    if (subscription.status === 'cancelled') {
      throw new BadRequestException(`Subscription already cancelled for donor: ${donorId}`);
    }

    // Update subscription status
    subscription.status = 'cancelled';

    this.logger.log(`Subscription cancelled successfully: ${donorId}`, {
      donorId: subscription.donorId,
      successfulCharges: subscription.successfulCharges,
      failedCharges: subscription.failedCharges,
      totalSubscriptions: this.subscriptions.size
    });

    return subscription;
  }

  /**
   * Get all active subscriptions.
   * @returns Array of active subscriptions
   */
  getActiveSubscriptions(): Subscription[] {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.status === 'active')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    this.logger.debug(`Retrieved ${activeSubscriptions.length} active subscriptions`);
    return activeSubscriptions;
  }

  /**
   * Get all subscriptions (active and cancelled).
   * @returns Array of all subscriptions
   */
  getAllSubscriptions(): Subscription[] {
    const allSubscriptions = Array.from(this.subscriptions.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    this.logger.debug(`Retrieved ${allSubscriptions.length} total subscriptions`);
    return allSubscriptions;
  }

  /**
   * Get donation transaction history.
   * @returns Array of donation transactions
   */
  getDonationHistory(): DonationTransaction[] {
    const sortedTransactions = [...this.transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    this.logger.debug(`Retrieved ${sortedTransactions.length} donation transactions`);
    return sortedTransactions;
  }

  /**
   * Get subscription by donor ID.
   * @param donorId - Donor identifier
   * @returns Subscription or null if not found
   */
  getSubscription(donorId: string): Subscription | null {
    return this.subscriptions.get(donorId) || null;
  }

  /**
   * Process billing for a subscription.
   * @param subscription - Subscription to bill
   * @returns Transaction result
   */
  async processBilling(subscription: Subscription): Promise<DonationTransaction> {
    const transactionId = 'don_' + uuidv4().slice(0, 8);
    
    this.logger.log(`Processing billing for subscription: ${subscription.donorId}`, {
      transactionId,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval
    });

    try {
      // Simulate payment processing (90% success rate)
      const isSuccess = Math.random() > 0.1;
      const provider = Math.random() < 0.5 ? 'stripe' : 'paypal';

      const transaction = new DonationTransaction();
      Object.assign(transaction, {
        transactionId,
        donorId: subscription.donorId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: isSuccess ? 'success' : 'failed',
        provider,
        errorMessage: isSuccess ? undefined : 'Payment processing failed',
        timestamp: new Date().toISOString(),
        campaignDescription: subscription.campaignDescription,
        tags: subscription.tags,
        summary: subscription.summary
      });

      // Store transaction
      this.transactions.push(transaction);

      // Update subscription stats
      if (isSuccess) {
        subscription.successfulCharges++;
        this.logger.log(`Billing successful: ${transactionId}`, {
          donorId: subscription.donorId,
          amount: subscription.amount,
          provider,
          successfulCharges: subscription.successfulCharges
        });
      } else {
        subscription.failedCharges++;
        this.logger.warn(`Billing failed: ${transactionId}`, {
          donorId: subscription.donorId,
          amount: subscription.amount,
          errorMessage: transaction.errorMessage,
          failedCharges: subscription.failedCharges
        });
      }

      return transaction;
    } catch (error) {
      this.logger.error(`Billing processing error: ${error.message}`, error.stack);
      
      const failedTransaction = new DonationTransaction();
      Object.assign(failedTransaction, {
        transactionId,
        donorId: subscription.donorId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: 'failed',
        provider: 'unknown',
        errorMessage: 'Internal processing error',
        timestamp: new Date().toISOString(),
        campaignDescription: subscription.campaignDescription,
        tags: subscription.tags,
        summary: subscription.summary
      });

      this.transactions.push(failedTransaction);
      subscription.failedCharges++;
      
      return failedTransaction;
    }
  }

  /**
   * Update subscription billing schedule.
   * @param subscription - Subscription to update
   */
  updateBillingSchedule(subscription: Subscription): void {
    const now = new Date();
    const nextBillingAt = this.calculateNextBillingDate(now, subscription.interval);
    
    subscription.lastBilledAt = now.toISOString();
    subscription.nextBillingAt = nextBillingAt.toISOString();

    this.logger.debug(`Updated billing schedule for ${subscription.donorId}`, {
      lastBilledAt: subscription.lastBilledAt,
      nextBillingAt: subscription.nextBillingAt
    });
  }

  /**
   * Calculate next billing date based on interval.
   * @param fromDate - Starting date
   * @param interval - Billing interval
   * @returns Next billing date
   */
  private calculateNextBillingDate(fromDate: Date, interval: 'weekly' | 'monthly' | 'yearly'): Date {
    const nextDate = new Date(fromDate);
    
    switch (interval) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        throw new Error(`Invalid interval: ${interval}`);
    }
    
    return nextDate;
  }

  /**
   * Get subscriptions due for billing.
   * @returns Array of subscriptions ready for billing
   */
  getSubscriptionsDueForBilling(): Subscription[] {
    const now = new Date();
    const dueSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.status === 'active' && 
        new Date(sub.nextBillingAt) <= now
      );

    this.logger.debug(`Found ${dueSubscriptions.length} subscriptions due for billing`);
    return dueSubscriptions;
  }

  /**
   * Get subscription statistics.
   * @returns Subscription statistics
   */
  getStatistics() {
    const allSubscriptions = Array.from(this.subscriptions.values());
    const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'active');
    const totalAmount = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    const totalSuccessfulCharges = allSubscriptions.reduce((sum, sub) => sum + sub.successfulCharges, 0);
    const totalFailedCharges = allSubscriptions.reduce((sum, sub) => sum + sub.failedCharges, 0);

    return {
      totalSubscriptions: allSubscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      cancelledSubscriptions: allSubscriptions.length - activeSubscriptions.length,
      totalMonthlyAmount: totalAmount,
      totalSuccessfulCharges,
      totalFailedCharges,
      successRate: totalSuccessfulCharges + totalFailedCharges > 0 
        ? (totalSuccessfulCharges / (totalSuccessfulCharges + totalFailedCharges) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
} 