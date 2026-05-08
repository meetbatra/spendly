import type { ToolId } from '@/types/audit';

export type ToolCategory = 'coding-assistant' | 'ai-chat' | 'api';

export interface ToolDefinition {
  toolId: ToolId;
  displayName: string;
  vendor: string;
  category: ToolCategory;
  description: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    toolId: 'cursor',
    displayName: 'Cursor',
    vendor: 'Anysphere',
    category: 'coding-assistant',
    description: 'AI-native code editor focused on agentic coding workflows and team collaboration.',
  },
  {
    toolId: 'github-copilot',
    displayName: 'GitHub Copilot',
    vendor: 'GitHub',
    category: 'coding-assistant',
    description: 'AI coding assistant integrated into GitHub and major IDEs for code completion and chat.',
  },
  {
    toolId: 'claude',
    displayName: 'Claude',
    vendor: 'Anthropic',
    category: 'ai-chat',
    description: 'General-purpose AI assistant for writing, analysis, reasoning, and coding support.',
  },
  {
    toolId: 'chatgpt',
    displayName: 'ChatGPT',
    vendor: 'OpenAI',
    category: 'ai-chat',
    description: 'General-purpose AI assistant for chat, research, writing, and coding tasks.',
  },
  {
    toolId: 'openai-api',
    displayName: 'OpenAI API',
    vendor: 'OpenAI',
    category: 'api',
    description: 'Usage-based API access to OpenAI models for custom product and workflow integrations.',
  },
  {
    toolId: 'anthropic-api',
    displayName: 'Anthropic API',
    vendor: 'Anthropic',
    category: 'api',
    description: 'Usage-based API access to Claude models for application and backend integrations.',
  },
  {
    toolId: 'gemini',
    displayName: 'Gemini (Google AI Plans)',
    vendor: 'Google',
    category: 'ai-chat',
    description: 'Google’s consumer AI plans providing Gemini access with higher usage tiers.',
  },
  {
    toolId: 'windsurf',
    displayName: 'Windsurf',
    vendor: 'Cognition (formerly Codeium)',
    category: 'coding-assistant',
    description: 'Agentic coding environment with integrated AI models, team controls, and developer tools.',
  },
];
