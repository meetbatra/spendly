export type ToolId =
  | 'cursor'
  | 'github-copilot'
  | 'claude'
  | 'chatgpt'
  | 'openai-api'
  | 'anthropic-api'
  | 'gemini'
  | 'windsurf';

export type PlanId = string;

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export interface ToolEntry {
  toolId: ToolId;
  planId: PlanId;
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  tools: ToolEntry[];
  teamSize: number;
  useCase: UseCase;
}

export type RecommendedAction = 'downgrade' | 'switch' | 'consolidate' | 'keep';

export interface AuditRecommendation {
  toolId: ToolId;
  currentPlanId: PlanId;
  currentMonthlyCost: number;
  recommendedAction: RecommendedAction;
  recommendedPlanId?: PlanId;
  recommendedToolId?: ToolId;
  monthlySavings: number;
  annualSavings: number;
  reasoning: string;
  credexRelevant: boolean;
}

export type SavingsTier = 'none' | 'low' | 'medium' | 'high';

export interface AuditResult {
  input: AuditInput;
  recommendations: AuditRecommendation[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  savingsTier: SavingsTier;
  generatedAt: Date;
  shareId: string;
  summary?: string;
}

export interface LeadCaptureInput {
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  auditId: string;
}

// Backward-compatible alias for existing engine placeholders.
export type AuditRequest = AuditInput;
