import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { configuration } from '../../config/configuration';

export interface LLMCampaignAnalysis {
  tags: string[];
  summary: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly config = configuration();
  
  // Cache for LLM responses to avoid redundant calls
  private llmCache: Map<string, LLMCampaignAnalysis> = new Map();

  /**
   * Generate campaign tags and summary using LLM.
   * @param campaignDescription - Campaign description to analyze
   * @returns LLM-generated tags and summary
   */
  async analyzeCampaign(campaignDescription: string): Promise<LLMCampaignAnalysis> {
    // Check cache first
    const cacheKey = this.getCacheKey(campaignDescription);
    if (this.llmCache.has(cacheKey)) {
      this.logger.debug('Using cached LLM analysis');
      return this.llmCache.get(cacheKey)!;
    }

    // Skip LLM calls during testing to avoid external dependencies
    if (process.env.NODE_ENV === 'test') {
      const mockAnalysis = this.generateMockAnalysis(campaignDescription);
      this.llmCache.set(cacheKey, mockAnalysis);
      return mockAnalysis;
    }

    try {
      this.logger.log('Generating LLM analysis for campaign');
      
      const prompt = `Analyze this campaign description and provide:
1. 3-5 relevant tags (comma-separated)
2. A one-sentence summary

Campaign: "${campaignDescription}"

Format your response as JSON:
{
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "One sentence summary here."
}`;

      const response = await axios.post(`${this.config.llm.apiUrl}/api/generate`, {
        model: this.config.llm.model,
        prompt,
        stream: false,
        num_predict: this.config.llm.maxTokens,
        temperature: this.config.llm.temperature
      });

      // Parse LLM response
      const llmResponse = response.data.response.trim();
      let analysis: LLMCampaignAnalysis;
      
      try {
        // Try to parse as JSON
        analysis = JSON.parse(llmResponse);
      } catch (parseError) {
        // Fallback parsing if JSON is malformed
        this.logger.warn('Failed to parse LLM response as JSON, using fallback parsing');
        analysis = this.parseFallbackResponse(llmResponse);
      }

      // Validate and sanitize response
      analysis = this.sanitizeAnalysis(analysis);
      
      // Cache the result
      this.llmCache.set(cacheKey, analysis);
      
      this.logger.log('LLM analysis generated successfully', {
        tags: analysis.tags,
        summaryLength: analysis.summary.length
      });
      
      return analysis;
    } catch (error) {
      this.logger.error(`LLM API error: ${error.message}`, error.stack);
      // Fallback to mock analysis
      const fallbackAnalysis = this.generateMockAnalysis(campaignDescription);
      this.llmCache.set(cacheKey, fallbackAnalysis);
      return fallbackAnalysis;
    }
  }

  /**
   * Generate mock analysis for testing.
   */
  private generateMockAnalysis(campaignDescription: string): LLMCampaignAnalysis {
    const lowerDescription = campaignDescription.toLowerCase();
    
    // Generate tags based on common keywords
    const tags: string[] = [];
    if (lowerDescription.includes('emergency') || lowerDescription.includes('disaster')) {
      tags.push('emergency relief');
    }
    if (lowerDescription.includes('food') || lowerDescription.includes('hunger')) {
      tags.push('food security');
    }
    if (lowerDescription.includes('water') || lowerDescription.includes('clean')) {
      tags.push('clean water');
    }
    if (lowerDescription.includes('education') || lowerDescription.includes('school')) {
      tags.push('education');
    }
    if (lowerDescription.includes('health') || lowerDescription.includes('medical')) {
      tags.push('healthcare');
    }
    
    // Add location-based tags
    if (lowerDescription.includes('nepal')) {
      tags.push('Nepal');
    }
    if (lowerDescription.includes('africa')) {
      tags.push('Africa');
    }
    if (lowerDescription.includes('asia')) {
      tags.push('Asia');
    }
    
    // Ensure we have at least 2 tags
    if (tags.length < 2) {
      tags.push('humanitarian aid', 'community support');
    }

    // Generate summary
    const summary = `This campaign provides ${tags.join(', ')} to communities in need.`;

    return { tags: tags.slice(0, 5), summary };
  }

  /**
   * Parse fallback response when JSON parsing fails.
   */
  private parseFallbackResponse(response: string): LLMCampaignAnalysis {
    const lines = response.split('\n');
    const tags: string[] = [];
    let summary = '';

    for (const line of lines) {
      if (line.toLowerCase().includes('tag') && line.includes(':')) {
        const tagPart = line.split(':')[1]?.trim();
        if (tagPart) {
          const extractedTags = tagPart.split(',').map(t => t.trim().replace(/["\[\]]/g, ''));
          tags.push(...extractedTags);
        }
      } else if (line.toLowerCase().includes('summary') && line.includes(':')) {
        summary = line.split(':')[1]?.trim().replace(/"/g, '') || '';
      }
    }

    return {
      tags: tags.length > 0 ? tags : ['humanitarian aid'],
      summary: summary || 'Campaign provides essential support to communities in need.'
    };
  }

  /**
   * Sanitize and validate LLM analysis response.
   */
  private sanitizeAnalysis(analysis: any): LLMCampaignAnalysis {
    // Ensure tags is an array
    let tags = Array.isArray(analysis.tags) ? analysis.tags : [];
    tags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
    tags = tags.map(tag => tag.trim().toLowerCase());
    
    // Ensure we have at least 2 tags
    if (tags.length < 2) {
      tags = ['humanitarian aid', 'community support'];
    }

    // Ensure summary is a string
    let summary = typeof analysis.summary === 'string' ? analysis.summary.trim() : '';
    if (!summary) {
      summary = 'Campaign provides essential support to communities in need.';
    }

    return { tags: tags.slice(0, 5), summary };
  }

  /**
   * Generate cache key for campaign description.
   */
  private getCacheKey(campaignDescription: string): string {
    return campaignDescription.toLowerCase().replace(/\s+/g, ' ').trim();
  }
} 