import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Body, 
  Param, 
  HttpCode, 
  HttpStatus,
  Logger,
  ValidationPipe,
  Version
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse
} from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { BillingSchedulerService } from '../services/billing-scheduler.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { DonationTransaction } from '../entities/donation-transaction.entity';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly billingSchedulerService: BillingSchedulerService
  ) {}

  @Version('1')
  @Post()
  @ApiOperation({
    summary: 'Create a new subscription',
    description: 'Creates a new donation subscription with LLM-powered campaign analysis'
  })
  @ApiBody({
    type: CreateSubscriptionDto,
    description: 'Subscription creation data',
    examples: {
      emergencyRelief: {
        summary: 'Emergency relief campaign',
        description: 'Subscription for emergency food and water relief',
        value: {
          donorId: 'emergency123',
          amount: 1500,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor@example.com',
          interval: 'monthly',
          campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal'
        }
      },
      educationFund: {
        summary: 'Education fund campaign',
        description: 'Subscription for children education support',
        value: {
          donorId: 'education456',
          amount: 2500,
          currency: 'USD',
          source: 'tok_test',
          email: 'supporter@charity.org',
          interval: 'monthly',
          campaignDescription: 'Supporting children education in rural communities across Africa'
        }
      },
      medicalAid: {
        summary: 'Medical aid campaign',
        description: 'Subscription for medical supplies and healthcare',
        value: {
          donorId: 'medical789',
          amount: 1000,
          currency: 'USD',
          source: 'tok_test',
          email: 'healthcare@donor.com',
          interval: 'weekly',
          campaignDescription: 'Providing essential medical supplies and healthcare services to disaster-affected regions'
        }
      },
      animalWelfare: {
        summary: 'Animal welfare campaign',
        description: 'Subscription for animal rescue and care',
        value: {
          donorId: 'animals101',
          amount: 750,
          currency: 'USD',
          source: 'tok_test',
          email: 'animal_lover@example.com',
          interval: 'monthly',
          campaignDescription: 'Rescuing and caring for abandoned animals in urban areas'
        }
      },
      environmental: {
        summary: 'Environmental conservation',
        description: 'Subscription for environmental protection',
        value: {
          donorId: 'eco202',
          amount: 3000,
          currency: 'USD',
          source: 'tok_test',
          email: 'environment@green.org',
          interval: 'yearly',
          campaignDescription: 'Protecting endangered species and preserving natural habitats in the Amazon rainforest'
        }
      },
      weeklyDonation: {
        summary: 'Weekly donation',
        description: 'Small weekly donation for community support',
        value: {
          donorId: 'weekly303',
          amount: 50,
          currency: 'USD',
          source: 'tok_test',
          email: 'community@local.org',
          interval: 'weekly',
          campaignDescription: 'Supporting local community programs and youth development initiatives'
        }
      },
      yearlyDonation: {
        summary: 'Yearly donation',
        description: 'Large yearly donation for major projects',
        value: {
          donorId: 'yearly404',
          amount: 5000,
          currency: 'USD',
          source: 'tok_test',
          email: 'major_donor@foundation.com',
          interval: 'yearly',
          campaignDescription: 'Building sustainable infrastructure and renewable energy projects in developing countries'
        }
      },
      minimumAmount: {
        summary: 'Minimum amount donation',
        description: 'Minimum donation amount test',
        value: {
          donorId: 'min505',
          amount: 1,
          currency: 'USD',
          source: 'tok_test',
          email: 'minimal@test.com',
          interval: 'monthly',
          campaignDescription: 'Testing minimum donation amounts for campaign validation'
        }
      },
      differentCurrency: {
        summary: 'Different currency donation',
        description: 'Donation in EUR currency',
        value: {
          donorId: 'eur606',
          amount: 100,
          currency: 'EUR',
          source: 'tok_test',
          email: 'european@donor.eu',
          interval: 'monthly',
          campaignDescription: 'Supporting European humanitarian aid programs and refugee assistance'
        }
      }
    }
  })
  @ApiCreatedResponse({
    description: 'Subscription created successfully',
    type: Subscription,
    schema: {
      example: {
        donorId: 'emergency123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal',
        tags: ['emergency relief', 'clean water', 'Nepal', 'disaster response'],
        summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal, focusing on food security and clean water access.',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
        nextBillingAt: '2024-02-15T10:30:00Z',
        successfulCharges: 0,
        failedCharges: 0
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or subscription already exists',
    schema: {
      example: {
        statusCode: 400,
        message: 'Subscription already exists for donor: emergency123',
        error: 'Bad Request'
      }
    }
  })
  async createSubscription(
    @Body(ValidationPipe) createSubscriptionDto: CreateSubscriptionDto
  ): Promise<Subscription> {
    this.logger.log(`Creating subscription for donor: ${createSubscriptionDto.donorId}`);
    
    const subscription = await this.subscriptionsService.createSubscription(createSubscriptionDto);
    
    this.logger.log(`Subscription created successfully: ${subscription.donorId}`);
    return subscription;
  }

  @Version('1')
  @Delete(':donorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a subscription',
    description: 'Cancels an active subscription for the specified donor'
  })
  @ApiParam({
    name: 'donorId',
    description: 'Unique donor identifier',
    examples: {
      emergencyDonor: {
        summary: 'Emergency relief donor',
        value: 'emergency123'
      },
      educationDonor: {
        summary: 'Education fund donor',
        value: 'education456'
      },
      medicalDonor: {
        summary: 'Medical aid donor',
        value: 'medical789'
      },
      animalDonor: {
        summary: 'Animal welfare donor',
        value: 'animals101'
      },
      environmentalDonor: {
        summary: 'Environmental donor',
        value: 'eco202'
      }
    }
  })
  @ApiOkResponse({
    description: 'Subscription cancelled successfully',
    type: Subscription,
    schema: {
      example: {
        donorId: 'emergency123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal',
        tags: ['emergency relief', 'clean water', 'Nepal', 'disaster response'],
        summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal, focusing on food security and clean water access.',
        status: 'cancelled',
        createdAt: '2024-01-15T10:30:00Z',
        nextBillingAt: '2024-02-15T10:30:00Z',
        lastBilledAt: '2024-01-15T10:30:00Z',
        successfulCharges: 2,
        failedCharges: 0
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription not found for donor: nonexistent123',
        error: 'Not Found'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Subscription already cancelled',
    schema: {
      example: {
        statusCode: 400,
        message: 'Subscription already cancelled for donor: emergency123',
        error: 'Bad Request'
      }
    }
  })
  async cancelSubscription(@Param('donorId') donorId: string): Promise<Subscription> {
    this.logger.log(`Cancelling subscription for donor: ${donorId}`);
    
    const subscription = await this.subscriptionsService.cancelSubscription(donorId);
    
    this.logger.log(`Subscription cancelled successfully: ${donorId}`);
    return subscription;
  }

  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'Get all subscriptions',
    description: 'Retrieves all subscriptions (active and cancelled)'
  })
  @ApiOkResponse({
    description: 'List of all subscriptions',
    type: [Subscription],
    schema: {
      example: [
        {
          donorId: 'emergency123',
          amount: 1500,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor@example.com',
          interval: 'monthly',
          campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal',
          tags: ['emergency relief', 'clean water', 'Nepal', 'disaster response'],
          summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal, focusing on food security and clean water access.',
          status: 'active',
          createdAt: '2024-01-15T10:30:00Z',
          nextBillingAt: '2024-02-15T10:30:00Z',
          lastBilledAt: '2024-01-15T10:30:00Z',
          successfulCharges: 2,
          failedCharges: 0
        },
        {
          donorId: 'education456',
          amount: 2500,
          currency: 'USD',
          source: 'tok_test',
          email: 'supporter@charity.org',
          interval: 'monthly',
          campaignDescription: 'Supporting children education in rural communities across Africa',
          tags: ['education', 'children', 'Africa', 'rural development'],
          summary: 'This campaign focuses on providing quality education to children in rural African communities.',
          status: 'active',
          createdAt: '2024-01-16T11:30:00Z',
          nextBillingAt: '2024-02-16T11:30:00Z',
          lastBilledAt: '2024-01-16T11:30:00Z',
          successfulCharges: 1,
          failedCharges: 0
        },
        {
          donorId: 'medical789',
          amount: 1000,
          currency: 'USD',
          source: 'tok_test',
          email: 'healthcare@donor.com',
          interval: 'weekly',
          campaignDescription: 'Providing essential medical supplies and healthcare services to disaster-affected regions',
          tags: ['medical aid', 'healthcare', 'disaster relief', 'emergency'],
          summary: 'This campaign delivers critical medical supplies and healthcare services to disaster-affected areas.',
          status: 'cancelled',
          createdAt: '2024-01-14T09:30:00Z',
          nextBillingAt: '2024-01-21T09:30:00Z',
          lastBilledAt: '2024-01-14T09:30:00Z',
          successfulCharges: 3,
          failedCharges: 1
        }
      ]
    }
  })
  async getAllSubscriptions(): Promise<Subscription[]> {
    this.logger.debug('Retrieving all subscriptions');
    return this.subscriptionsService.getAllSubscriptions();
  }

  @Version('1')
  @Get('active')
  @ApiOperation({
    summary: 'Get active subscriptions',
    description: 'Retrieves only active subscriptions'
  })
  @ApiOkResponse({
    description: 'List of active subscriptions',
    type: [Subscription],
    schema: {
      example: [
        {
          donorId: 'emergency123',
          amount: 1500,
          currency: 'USD',
          source: 'tok_test',
          email: 'donor@example.com',
          interval: 'monthly',
          campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal',
          tags: ['emergency relief', 'clean water', 'Nepal', 'disaster response'],
          summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal, focusing on food security and clean water access.',
          status: 'active',
          createdAt: '2024-01-15T10:30:00Z',
          nextBillingAt: '2024-02-15T10:30:00Z',
          lastBilledAt: '2024-01-15T10:30:00Z',
          successfulCharges: 2,
          failedCharges: 0
        },
        {
          donorId: 'education456',
          amount: 2500,
          currency: 'USD',
          source: 'tok_test',
          email: 'supporter@charity.org',
          interval: 'monthly',
          campaignDescription: 'Supporting children education in rural communities across Africa',
          tags: ['education', 'children', 'Africa', 'rural development'],
          summary: 'This campaign focuses on providing quality education to children in rural African communities.',
          status: 'active',
          createdAt: '2024-01-16T11:30:00Z',
          nextBillingAt: '2024-02-16T11:30:00Z',
          lastBilledAt: '2024-01-16T11:30:00Z',
          successfulCharges: 1,
          failedCharges: 0
        },
        {
          donorId: 'animals101',
          amount: 750,
          currency: 'USD',
          source: 'tok_test',
          email: 'animal_lover@example.com',
          interval: 'monthly',
          campaignDescription: 'Rescuing and caring for abandoned animals in urban areas',
          tags: ['animal welfare', 'rescue', 'urban areas', 'care'],
          summary: 'This campaign focuses on rescuing and providing care for abandoned animals in urban environments.',
          status: 'active',
          createdAt: '2024-01-17T12:30:00Z',
          nextBillingAt: '2024-02-17T12:30:00Z',
          lastBilledAt: '2024-01-17T12:30:00Z',
          successfulCharges: 0,
          failedCharges: 0
        }
      ]
    }
  })
  async getActiveSubscriptions(): Promise<Subscription[]> {
    this.logger.debug('Retrieving active subscriptions');
    return this.subscriptionsService.getActiveSubscriptions();
  }

  @Version('1')
  @Get(':donorId')
  @ApiOperation({
    summary: 'Get subscription by donor ID',
    description: 'Retrieves a specific subscription by donor identifier'
  })
  @ApiParam({
    name: 'donorId',
    description: 'Unique donor identifier',
    examples: {
      emergencyDonor: {
        summary: 'Emergency relief donor',
        value: 'emergency123'
      },
      educationDonor: {
        summary: 'Education fund donor',
        value: 'education456'
      },
      medicalDonor: {
        summary: 'Medical aid donor',
        value: 'medical789'
      },
      animalDonor: {
        summary: 'Animal welfare donor',
        value: 'animals101'
      },
      environmentalDonor: {
        summary: 'Environmental donor',
        value: 'eco202'
      },
      weeklyDonor: {
        summary: 'Weekly donation donor',
        value: 'weekly303'
      },
      yearlyDonor: {
        summary: 'Yearly donation donor',
        value: 'yearly404'
      }
    }
  })
  @ApiOkResponse({
    description: 'Subscription found',
    type: Subscription,
    schema: {
      example: {
        donorId: 'emergency123',
        amount: 1500,
        currency: 'USD',
        source: 'tok_test',
        email: 'donor@example.com',
        interval: 'monthly',
        campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal',
        tags: ['emergency relief', 'clean water', 'Nepal', 'disaster response'],
        summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal, focusing on food security and clean water access.',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
        nextBillingAt: '2024-02-15T10:30:00Z',
        lastBilledAt: '2024-01-15T10:30:00Z',
        successfulCharges: 2,
        failedCharges: 0
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription not found for donor: nonexistent123',
        error: 'Not Found'
      }
    }
  })
  async getSubscription(@Param('donorId') donorId: string): Promise<Subscription> {
    this.logger.debug(`Retrieving subscription for donor: ${donorId}`);
    
    const subscription = this.subscriptionsService.getSubscription(donorId);
    if (!subscription) {
      this.logger.warn(`Subscription not found for donor: ${donorId}`);
      throw new Error(`Subscription not found for donor: ${donorId}`);
    }
    
    return subscription;
  }

  @Version('1')
  @Get('transactions/history')
  @ApiOperation({
    summary: 'Get donation history',
    description: 'Retrieves all donation transaction history'
  })
  @ApiOkResponse({
    description: 'List of donation transactions',
    type: [DonationTransaction],
    schema: {
      example: [
        {
          transactionId: 'don_abc123',
          donorId: 'emergency123',
          amount: 1500,
          currency: 'USD',
          status: 'success',
          provider: 'stripe',
          errorMessage: null,
          timestamp: '2024-01-15T10:30:00Z',
          campaignDescription: 'Emergency food and clean water for earthquake victims in Nepal',
          tags: ['emergency relief', 'clean water', 'Nepal', 'disaster response'],
          summary: 'This campaign provides emergency aid to earthquake-affected communities in Nepal, focusing on food security and clean water access.'
        },
        {
          transactionId: 'don_def456',
          donorId: 'education456',
          amount: 2500,
          currency: 'USD',
          status: 'success',
          provider: 'paypal',
          errorMessage: null,
          timestamp: '2024-01-16T11:30:00Z',
          campaignDescription: 'Supporting children education in rural communities across Africa',
          tags: ['education', 'children', 'Africa', 'rural development'],
          summary: 'This campaign focuses on providing quality education to children in rural African communities.'
        },
        {
          transactionId: 'don_ghi789',
          donorId: 'medical789',
          amount: 1000,
          currency: 'USD',
          status: 'failed',
          provider: 'stripe',
          errorMessage: 'Payment processing failed',
          timestamp: '2024-01-14T09:30:00Z',
          campaignDescription: 'Providing essential medical supplies and healthcare services to disaster-affected regions',
          tags: ['medical aid', 'healthcare', 'disaster relief', 'emergency'],
          summary: 'This campaign delivers critical medical supplies and healthcare services to disaster-affected areas.'
        },
        {
          transactionId: 'don_jkl012',
          donorId: 'animals101',
          amount: 750,
          currency: 'USD',
          status: 'success',
          provider: 'paypal',
          errorMessage: null,
          timestamp: '2024-01-17T12:30:00Z',
          campaignDescription: 'Rescuing and caring for abandoned animals in urban areas',
          tags: ['animal welfare', 'rescue', 'urban areas', 'care'],
          summary: 'This campaign focuses on rescuing and providing care for abandoned animals in urban environments.'
        }
      ]
    }
  })
  async getDonationHistory(): Promise<DonationTransaction[]> {
    this.logger.debug('Retrieving donation history');
    return this.subscriptionsService.getDonationHistory();
  }

  @Version('1')
  @Get('statistics/overview')
  @ApiOperation({
    summary: 'Get subscription statistics',
    description: 'Retrieves overview statistics for all subscriptions'
  })
  @ApiOkResponse({
    description: 'Subscription statistics',
    schema: {
      type: 'object',
      properties: {
        totalSubscriptions: { type: 'number' },
        activeSubscriptions: { type: 'number' },
        cancelledSubscriptions: { type: 'number' },
        totalMonthlyAmount: { type: 'number' },
        totalSuccessfulCharges: { type: 'number' },
        totalFailedCharges: { type: 'number' },
        successRate: { type: 'string' }
      },
      example: {
        totalSubscriptions: 5,
        activeSubscriptions: 3,
        cancelledSubscriptions: 2,
        totalMonthlyAmount: 4750,
        totalSuccessfulCharges: 6,
        totalFailedCharges: 1,
        successRate: '85.71%'
      }
    }
  })
  async getStatistics() {
    this.logger.debug('Retrieving subscription statistics');
    return this.subscriptionsService.getStatistics();
  }

  @Version('1')
  @Post('billing/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger billing processing',
    description: 'Manually triggers the billing scheduler to process due subscriptions (for testing)'
  })
  @ApiOkResponse({
    description: 'Billing processing triggered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      example: {
        message: 'Billing processing triggered successfully'
      }
    }
  })
  async triggerBillingProcessing(): Promise<{ message: string }> {
    this.logger.log('Manually triggering billing processing');
    await this.billingSchedulerService.triggerBillingProcessing();
    return { message: 'Billing processing triggered successfully' };
  }

  @Version('1')
  @Get('billing/status')
  @ApiOperation({
    summary: 'Get billing scheduler status',
    description: 'Retrieves the current status of the billing scheduler'
  })
  @ApiOkResponse({
    description: 'Billing scheduler status',
    schema: {
      type: 'object',
      properties: {
        isRunning: { type: 'boolean' },
        intervalMs: { type: 'number' },
        nextRun: { type: 'string', format: 'date-time' }
      },
      example: {
        isRunning: true,
        intervalMs: 60000,
        nextRun: '2024-01-15T10:31:00Z'
      }
    }
  })
  async getBillingStatus() {
    this.logger.debug('Retrieving billing scheduler status');
    return this.billingSchedulerService.getSchedulerStatus();
  }
} 