import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ChargeDto } from '../dto/charge.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Transaction } from '../entities/transaction.entity';
import { configuration } from '../../config/configuration';

// Type for fraud config loaded from JSON
interface FraudConfig {
  amountThreshold: number; // Amount above which risk increases
  amountRisk: number; // Risk increment for large amount
  suspiciousDomains: string[]; // List of suspicious email domains
  domainRisk: number; // Risk increment for suspicious domain
  velocityThreshold: number; // Max allowed charges per email in last hour
  velocityRisk: number; // Risk increment for velocity
  geoMismatchRisk: number; // Risk increment for geolocation mismatch
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly config = configuration();
  
  // In-memory transaction log
  private transactions: Transaction[] = [];
  // Fraud config loaded at startup
  private fraudConfig: FraudConfig;
  // LLM explanation cache to avoid redundant calls
  private llmCache: Map<string, string> = new Map();
  
  constructor() {
    // Load fraud config from JSON file at startup
    this.logger.log(`LLM API URL configured as: ${this.config.llm.apiUrl}`);
    const configPath = path.join(process.cwd(), this.config.fraud.configPath);
    this.fraudConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    this.logger.log('Fraud configuration loaded successfully');
  }

  /**
   * Simulate a payment charge, applying fraud heuristics and LLM explanation.
   * @param chargeDto - Payment details
   * @returns Transaction object with routing, risk, and explanation
   */
  async charge(chargeDto: ChargeDto): Promise<Transaction> {
    const transactionId = 'txn_' + uuidv4().slice(0, 8);
    this.logger.log(`Processing charge request: ${transactionId}`, {
      amount: chargeDto.amount,
      currency: chargeDto.currency,
      email: chargeDto.email,
      ipCountry: chargeDto.ipCountry,
      billingCountry: chargeDto.billingCountry
    });

    // Start with a low base risk score for more predictable behavior
    let riskScore = 0.1; // Lower base risk for more deterministic testing
    let explanationParts: string[] = [];
    const { amountThreshold, amountRisk, suspiciousDomains, domainRisk, velocityThreshold, velocityRisk, geoMismatchRisk } = this.fraudConfig;

    // Heuristic: Large amount increases risk
    if (chargeDto.amount > amountThreshold) {
      riskScore += amountRisk;
      explanationParts.push('large amount');
      this.logger.warn(`Large amount heuristic triggered for ${transactionId}: $${chargeDto.amount} > $${amountThreshold}`);
    }
    
    // Heuristic: Suspicious email domain increases risk
    const emailDomain = chargeDto.email.split('@')[1]?.toLowerCase() || '';
    const isSuspiciousDomain = suspiciousDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      // Handle .ru subdomains and exact matches
      if (domainLower.startsWith('.')) {
        return emailDomain.endsWith(domainLower);
      }
      // Handle exact matches and subdomains
      return emailDomain === domainLower || emailDomain.endsWith('.' + domainLower);
    });
    
    if (isSuspiciousDomain) {
      riskScore += domainRisk;
      explanationParts.push('suspicious email domain');
      this.logger.warn(`Suspicious domain heuristic triggered for ${transactionId}: ${chargeDto.email} (domain: ${emailDomain})`);
    }
    
    // Heuristic: Velocity check (multiple charges in short time)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentCharges = this.transactions.filter(
      t => t.email === chargeDto.email && new Date(t.timestamp) > oneHourAgo
    );
    if (recentCharges.length >= velocityThreshold) {
      riskScore += velocityRisk;
      explanationParts.push('multiple charges in short time');
      this.logger.warn(`Velocity heuristic triggered for ${transactionId}: ${recentCharges.length} charges in last hour`);
    }
    
    // Heuristic: Geolocation mismatch (IP vs billing country)
    if (chargeDto.ipCountry && chargeDto.billingCountry && chargeDto.ipCountry !== chargeDto.billingCountry) {
      riskScore += geoMismatchRisk;
      explanationParts.push('geolocation mismatch');
      this.logger.warn(`Geolocation mismatch heuristic triggered for ${transactionId}: IP ${chargeDto.ipCountry} vs Billing ${chargeDto.billingCountry}`);
    }
    
    // Special case: Russian IP addresses are high risk
    if (chargeDto.ipCountry === 'RU') {
      riskScore += 0.4; // High risk for Russian IPs
      explanationParts.push('Russian IP address');
      this.logger.warn(`Russian IP heuristic triggered for ${transactionId}: IP ${chargeDto.ipCountry}`);
    }
    
    // Cap risk score at 1
    riskScore = Math.min(riskScore, 1);

    // Routing logic: success if risk < threshold, else blocked
    let provider: string | null = null;
    let status: 'success' | 'blocked';
    if (riskScore < this.config.fraud.riskBlockThreshold) {
      provider = Math.random() < 0.5 ? 'stripe' : 'paypal';
      status = 'success';
      this.logger.log(`Transaction ${transactionId} routed to ${provider} (risk: ${riskScore.toFixed(2)})`);
    } else {
      status = 'blocked';
      this.logger.warn(`Transaction ${transactionId} blocked due to high risk: ${riskScore.toFixed(2)}`);
    }

    // LLM explanation caching: avoid duplicate LLM calls for same scenario
    const llmKey = this.getLLMCacheKey(provider, riskScore, explanationParts);
    let explanation: string;
    if (this.llmCache.has(llmKey)) {
      explanation = this.llmCache.get(llmKey)!;
      this.logger.debug(`Using cached LLM explanation for ${transactionId}`);
    } else {
      // Call LLM API for explanation
      this.logger.log(`Generating new LLM explanation for ${transactionId}`);
      explanation = await this.getLLMExplanation(provider, riskScore, explanationParts, chargeDto, recentCharges.length);
      this.llmCache.set(llmKey, explanation);
    }

    // Build transaction object
    const transaction: Transaction = {
      transactionId,
      provider,
      status,
      riskScore: Number(riskScore.toFixed(2)),
      explanation,
      timestamp: new Date().toISOString(),
      amount: chargeDto.amount,
      currency: chargeDto.currency,
      email: chargeDto.email,
    };
    
    // Log transaction in memory
    this.transactions.push(transaction);
    
    // Log comprehensive transaction data
    this.logger.log(`Transaction completed: ${transactionId}`, {
      transactionId: transaction.transactionId,
      status: transaction.status,
      provider: transaction.provider,
      riskScore: transaction.riskScore,
      amount: transaction.amount,
      currency: transaction.currency,
      email: transaction.email,
      explanation: transaction.explanation,
      timestamp: transaction.timestamp,
      triggeredHeuristics: explanationParts,
      totalTransactionsInMemory: this.transactions.length
    });
    
    return transaction;
  }

  /**
   * Call the Ollama LLM API to generate a human-readable explanation.
   * @param provider - Payment provider or null if blocked
   * @param riskScore - Calculated risk score
   * @param reasons - List of fraud reasons
   * @param chargeDto - Original charge data for context
   * @param recentChargesCount - Number of recent charges for velocity context
   * @returns LLM-generated explanation string
   */
  private async getLLMExplanation(
    provider: string | null, 
    riskScore: number, 
    reasons: string[], 
    chargeDto: ChargeDto,
    recentChargesCount: number
  ): Promise<string> {
    // Skip LLM calls during testing to avoid external dependencies
    if (process.env.NODE_ENV === 'test') {
      const action = provider ? `routed to ${provider}` : 'blocked';
      const reasonText = reasons.length > 0 ? ` due to ${reasons.join(', ')}` : '';
      return `Payment ${action}${reasonText}. Risk score: ${riskScore.toFixed(2)}.`;
    }

    // Build context-specific details for each heuristic
    let contextDetails = '';
    
    if (reasons.includes('large amount')) {
      contextDetails += ` Amount: $${chargeDto.amount} (threshold: $${this.fraudConfig.amountThreshold}).`;
    }
    
    if (reasons.includes('suspicious email domain')) {
      contextDetails += ` Email domain: ${chargeDto.email.split('@')[1]} (suspicious domains: ${this.fraudConfig.suspiciousDomains.join(', ')}).`;
    }
    
    if (reasons.includes('multiple charges in short time')) {
      contextDetails += ` Recent charges: ${recentChargesCount} from same email in last hour (threshold: ${this.fraudConfig.velocityThreshold}).`;
    }
    
    if (reasons.includes('geolocation mismatch')) {
      contextDetails += ` IP country: ${chargeDto.ipCountry}, Billing country: ${chargeDto.billingCountry}.`;
    }

    const prompt = provider
      ? `Payment routed to ${provider}. Risk score: ${riskScore}. Reasons: ${reasons.join(', ')}.${contextDetails} Provide a clear, specific explanation in one sentence.`
      : `Payment blocked. Risk score: ${riskScore}. Reasons: ${reasons.join(', ')}.${contextDetails} Provide a clear, specific explanation in one sentence.`;

    try {
      this.logger.debug('Calling LLM API for explanation generation');
      // POST to Ollama LLM API
      const response = await axios.post(`${this.config.llm.apiUrl}/api/generate`, {
        model: this.config.llm.model,
        prompt,
        stream: false,
        num_predict: this.config.llm.maxTokens,
        stop: ['.'],     // Stop at first period
        temperature: this.config.llm.temperature
      });
      // Post-process: trim response to single sentence, remove newlines
      let explanation = response.data.response.trim().replace(/\n/g, ' ');
      explanation = explanation.split('. ')[0] + '.';
      this.logger.debug('LLM explanation generated successfully');
      return explanation;
    } catch (error) {
      // Fallback if LLM is unavailable
      this.logger.error(`LLM API error: ${error.message}`, error.stack);
      return 'LLM explanation unavailable.';
    }
  }

  /**
   * Generate a unique cache key for LLM explanations based on scenario.
   */
  private getLLMCacheKey(provider: string | null, riskScore: number, reasons: string[]): string {
    return `${provider}|${riskScore.toFixed(2)}|${reasons.sort().join(',')}`;
  }

  /**
   * Get all transactions processed so far (in-memory log).
   */
  getTransactions(): Transaction[] {
    this.logger.debug(`Retrieving ${this.transactions.length} transactions from memory`);
    return this.transactions;
  }
}
