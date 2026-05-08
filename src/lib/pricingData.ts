import type { ToolId } from '@/types/audit';

const VERIFIED_AT = '2026-05-08';

export interface PricingPlan {
  planId: string;
  planName: string;
  monthlyPricePerSeat: number | null;
  isPerSeat: boolean;
  notes: string;
}

export interface ToolPricing {
  toolId: ToolId;
  displayName: string;
  vendor: string;
  plans: PricingPlan[];
  sourceUrl: string;
  verifiedAt: string;
}

export interface PricingSource {
  toolId: ToolId;
  toolName: string;
  sourceUrl: string;
  verifiedAt: string;
}

export const PRICING_DATA: Record<ToolId, ToolPricing> = {
  cursor: {
    toolId: 'cursor',
    displayName: 'Cursor',
    vendor: 'Anysphere',
    sourceUrl: 'https://cursor.com/pricing',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'hobby',
        planName: 'Hobby',
        monthlyPricePerSeat: 0,
        isPerSeat: false,
        notes: 'Free individual plan.',
      },
      {
        planId: 'pro',
        planName: 'Pro',
        monthlyPricePerSeat: 20,
        isPerSeat: false,
        notes: 'Per user; monthly billing option shown on official pricing page.',
      },
      {
        planId: 'business',
        planName: 'Business',
        monthlyPricePerSeat: 40,
        isPerSeat: true,
        notes: 'Per user per month for teams/business usage.',
      },
    ],
  },
  'github-copilot': {
    toolId: 'github-copilot',
    displayName: 'GitHub Copilot',
    vendor: 'GitHub',
    sourceUrl: 'https://github.com/features/copilot/plans',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        isPerSeat: false,
        notes: 'Free tier with usage limits.',
      },
      {
        planId: 'pro',
        planName: 'Pro',
        monthlyPricePerSeat: 10,
        isPerSeat: false,
        notes: 'Individual paid plan.',
      },
      {
        planId: 'business',
        planName: 'Business',
        monthlyPricePerSeat: 19,
        isPerSeat: true,
        notes: 'Per user per month for organizations.',
      },
      {
        planId: 'enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: 39,
        isPerSeat: true,
        notes: 'Per user per month for enterprise controls and policy features.',
      },
    ],
  },
  claude: {
    toolId: 'claude',
    displayName: 'Claude',
    vendor: 'Anthropic',
    sourceUrl: 'https://claude.com/pricing',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        isPerSeat: false,
        notes: 'Free tier with usage limits.',
      },
      {
        planId: 'pro',
        planName: 'Pro',
        monthlyPricePerSeat: 20,
        isPerSeat: false,
        notes: 'Shown as $20 if billed monthly.',
      },
      {
        planId: 'max',
        planName: 'Max',
        monthlyPricePerSeat: 100,
        isPerSeat: false,
        notes: 'Shown as starting at $100/month.',
      },
      {
        planId: 'team',
        planName: 'Team',
        monthlyPricePerSeat: 25,
        isPerSeat: true,
        notes: 'Shown as $25 if billed monthly.',
      },
      {
        planId: 'enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: null,
        isPerSeat: true,
        notes: 'Enterprise options are sales-assisted/customized; contact sales for contract pricing.',
      },
    ],
  },
  chatgpt: {
    toolId: 'chatgpt',
    displayName: 'ChatGPT',
    vendor: 'OpenAI',
    sourceUrl: 'https://openai.com/chatgpt/pricing/',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        isPerSeat: false,
        notes: 'Free tier with usage limits.',
      },
      {
        planId: 'plus',
        planName: 'Plus',
        monthlyPricePerSeat: 20,
        isPerSeat: false,
        notes: 'Consumer paid tier.',
      },
      {
        planId: 'pro',
        planName: 'Pro',
        monthlyPricePerSeat: 200,
        isPerSeat: false,
        notes: 'High-usage individual tier at $200/month.',
      },
      {
        planId: 'business',
        planName: 'Business',
        monthlyPricePerSeat: 20,
        isPerSeat: true,
        notes:
          'Renamed from Team to Business in August 2025. Current pricing: $20/user/month billed annually or $25/user/month billed monthly (minimum 2 users).',
      },
      {
        planId: 'enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: null,
        isPerSeat: true,
        notes: 'Enterprise is contract-based; contact sales for pricing.',
      },
    ],
  },
  'openai-api': {
    toolId: 'openai-api',
    displayName: 'OpenAI API',
    vendor: 'OpenAI',
    sourceUrl: 'https://openai.com/api/pricing/',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'usage-based',
        planName: 'Usage-based',
        monthlyPricePerSeat: null,
        isPerSeat: false,
        notes: 'No flat seat plan; billed by model and token/usage.',
      },
    ],
  },
  'anthropic-api': {
    toolId: 'anthropic-api',
    displayName: 'Anthropic API',
    vendor: 'Anthropic',
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'usage-based',
        planName: 'Usage-based',
        monthlyPricePerSeat: null,
        isPerSeat: false,
        notes: 'No flat seat plan; billed by model and token usage.',
      },
    ],
  },
  gemini: {
    toolId: 'gemini',
    displayName: 'Gemini (Google AI Plans)',
    vendor: 'Google',
    sourceUrl: 'https://one.google.com/about/plans',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        isPerSeat: false,
        notes: 'Free Gemini access tier.',
      },
      {
        planId: 'one-ai-pro',
        planName: 'Google One AI Pro',
        monthlyPricePerSeat: 19.99,
        isPerSeat: false,
        notes: 'US pricing; regional prices can differ by locale and billing country.',
      },
      {
        planId: 'one-ai-ultra',
        planName: 'Google One AI Ultra',
        monthlyPricePerSeat: 249.99,
        isPerSeat: false,
        notes: 'US pricing for the highest consumer AI tier; availability and regional pricing vary.',
      },
    ],
  },
  windsurf: {
    toolId: 'windsurf',
    displayName: 'Windsurf',
    vendor: 'Cognition (formerly Codeium)',
    sourceUrl: 'https://windsurf.com/pricing',
    verifiedAt: VERIFIED_AT,
    plans: [
      {
        planId: 'free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        isPerSeat: false,
        notes: 'Free tier with usage limits.',
      },
      {
        planId: 'pro',
        planName: 'Pro',
        monthlyPricePerSeat: 15,
        isPerSeat: false,
        notes: 'Individual paid plan.',
      },
      {
        planId: 'teams',
        planName: 'Teams',
        monthlyPricePerSeat: 30,
        isPerSeat: true,
        notes: 'Per user per month for team deployment and controls.',
      },
    ],
  },
};

export const PRICING_SOURCES: PricingSource[] = [
  {
    toolId: 'cursor',
    toolName: 'Cursor',
    sourceUrl: 'https://cursor.com/pricing',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'github-copilot',
    toolName: 'GitHub Copilot (feature page)',
    sourceUrl: 'https://github.com/features/copilot/plans',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'github-copilot',
    toolName: 'GitHub Copilot (organization plan details)',
    sourceUrl: 'https://docs.github.com/en/copilot/get-started/plans',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'claude',
    toolName: 'Claude',
    sourceUrl: 'https://claude.com/pricing',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'chatgpt',
    toolName: 'ChatGPT',
    sourceUrl: 'https://openai.com/chatgpt/pricing/',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'openai-api',
    toolName: 'OpenAI API',
    sourceUrl: 'https://openai.com/api/pricing/',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'anthropic-api',
    toolName: 'Anthropic API',
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'gemini',
    toolName: 'Google One Plans',
    sourceUrl: 'https://one.google.com/about/plans',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'gemini',
    toolName: 'Google AI Plans overview',
    sourceUrl: 'https://one.google.com/about/google-ai-plans/',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'gemini',
    toolName: 'Google AI Ultra announcement',
    sourceUrl: 'https://blog.google/products/google-one/google-ai-ultra/',
    verifiedAt: VERIFIED_AT,
  },
  {
    toolId: 'windsurf',
    toolName: 'Windsurf',
    sourceUrl: 'https://windsurf.com/pricing',
    verifiedAt: VERIFIED_AT,
  },
];
