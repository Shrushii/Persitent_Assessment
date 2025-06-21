/**
 * Transaction entity for in-memory storage and API responses.
 */
export type Transaction = {
  /** Unique transaction ID */
  transactionId: string;
  /** Payment provider used (stripe, paypal, or null if blocked) */
  provider: string | null;
  /** Transaction status */
  status: 'success' | 'blocked';
  /** Calculated fraud risk score (0-1) */
  riskScore: number;
  /** LLM-generated explanation for routing/blocking */
  explanation: string;
  /** ISO timestamp of transaction */
  timestamp: string;
  amount: number;
  currency: string;
  email: string;
}; 