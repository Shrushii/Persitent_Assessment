import { Test, TestingModule } from '@nestjs/testing';
import { LLMService } from './llm.service';

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LLMService],
    }).compile();

    service = module.get<LLMService>(LLMService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeCampaign', () => {
    it('should generate mock analysis in test environment', async () => {
      const campaignDescription = 'Emergency food and clean water for earthquake victims in Nepal';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis).toBeDefined();
      expect(analysis.tags).toBeDefined();
      expect(Array.isArray(analysis.tags)).toBe(true);
      expect(analysis.tags.length).toBeGreaterThan(0);
      expect(analysis.summary).toBeDefined();
      expect(typeof analysis.summary).toBe('string');
      expect(analysis.summary.length).toBeGreaterThan(0);
    });

    it('should generate appropriate tags for emergency campaigns', async () => {
      const campaignDescription = 'Emergency disaster relief for hurricane victims';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('emergency relief');
    });

    it('should generate appropriate tags for food campaigns', async () => {
      const campaignDescription = 'Providing food and nutrition to hungry children';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('food security');
    });

    it('should generate appropriate tags for water campaigns', async () => {
      const campaignDescription = 'Clean water access for rural communities';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('clean water');
    });

    it('should generate appropriate tags for education campaigns', async () => {
      const campaignDescription = 'Building schools and providing education';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('education');
    });

    it('should generate appropriate tags for healthcare campaigns', async () => {
      const campaignDescription = 'Medical supplies and healthcare access';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('healthcare');
    });

    it('should include location-based tags for Nepal', async () => {
      const campaignDescription = 'Supporting communities in Nepal';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('Nepal');
    });

    it('should include location-based tags for Africa', async () => {
      const campaignDescription = 'Supporting communities in Africa';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('Africa');
    });

    it('should include location-based tags for Asia', async () => {
      const campaignDescription = 'Supporting communities in Asia';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('Asia');
    });

    it('should provide fallback tags for generic campaigns', async () => {
      const campaignDescription = 'General community support';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toContain('humanitarian aid');
      expect(analysis.tags).toContain('community support');
    });

    it('should limit tags to maximum of 5', async () => {
      const campaignDescription = 'Emergency food, water, education, healthcare, and disaster relief for Nepal, Africa, and Asia';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags.length).toBeLessThanOrEqual(5);
    });

    it('should generate meaningful summary', async () => {
      const campaignDescription = 'Emergency food and clean water for earthquake victims in Nepal';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.summary).toContain('campaign');
      expect(analysis.summary.length).toBeGreaterThan(20);
    });

    it('should use cache for identical campaign descriptions', async () => {
      const campaignDescription = 'Test campaign for caching';
      
      const analysis1 = await service.analyzeCampaign(campaignDescription);
      const analysis2 = await service.analyzeCampaign(campaignDescription);

      expect(analysis1).toEqual(analysis2);
    });

    it('should handle case-insensitive campaign descriptions', async () => {
      const campaignDescription1 = 'Emergency food and clean water for earthquake victims in Nepal';
      const campaignDescription2 = 'EMERGENCY FOOD AND CLEAN WATER FOR EARTHQUAKE VICTIMS IN NEPAL';
      
      const analysis1 = await service.analyzeCampaign(campaignDescription1);
      const analysis2 = await service.analyzeCampaign(campaignDescription2);

      expect(analysis1).toEqual(analysis2);
    });

    it('should handle campaign descriptions with extra whitespace', async () => {
      const campaignDescription1 = 'Emergency food and clean water for earthquake victims in Nepal';
      const campaignDescription2 = '  Emergency food and clean water for earthquake victims in Nepal  ';
      
      const analysis1 = await service.analyzeCampaign(campaignDescription1);
      const analysis2 = await service.analyzeCampaign(campaignDescription2);

      expect(analysis1).toEqual(analysis2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty campaign description', async () => {
      const analysis = await service.analyzeCampaign('');

      expect(analysis.tags).toContain('humanitarian aid');
      expect(analysis.tags).toContain('community support');
      expect(analysis.summary).toBeDefined();
    });

    it('should handle very long campaign description', async () => {
      const longDescription = 'A'.repeat(1000);
      
      const analysis = await service.analyzeCampaign(longDescription);

      expect(analysis.tags).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });

    it('should handle campaign description with special characters', async () => {
      const campaignDescription = 'Emergency relief for victims of Hurricane Katrina (2005) - $1M+ needed!';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });

    it('should handle campaign description with numbers', async () => {
      const campaignDescription = 'Providing 1000 meals and 500 water bottles to disaster victims';
      
      const analysis = await service.analyzeCampaign(campaignDescription);

      expect(analysis.tags).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });
  });
}); 