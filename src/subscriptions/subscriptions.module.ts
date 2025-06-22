import { Module } from '@nestjs/common';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionsService } from './services/subscriptions.service';
import { BillingSchedulerService } from './services/billing-scheduler.service';
import { LLMService } from './services/llm.service';
 
@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, BillingSchedulerService, LLMService],
})
export class SubscriptionsModule {} 