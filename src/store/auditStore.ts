import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PlanId, ToolId, UseCase } from '@/types/audit';

export interface ToolEntryDraft {
  planId: PlanId;
  seats: number;
  monthlySpend: number;
}

interface AuditFormState {
  teamSize: number;
  useCase: UseCase | '';
  selectedTools: ToolId[];
  toolEntries: Partial<Record<ToolId, ToolEntryDraft>>;
  setTeamSize: (teamSize: number) => void;
  setUseCase: (useCase: UseCase) => void;
  toggleTool: (toolId: ToolId) => void;
  setToolEntry: (toolId: ToolId, entry: Partial<ToolEntryDraft>) => void;
  resetForm: () => void;
}

const initialState = {
  teamSize: 1,
  useCase: '' as UseCase | '',
  selectedTools: [] as ToolId[],
  toolEntries: {} as Partial<Record<ToolId, ToolEntryDraft>>,
};

export const useAuditStore = create<AuditFormState>()(
  persist(
    (set) => ({
      ...initialState,
      setTeamSize: (teamSize) => set({ teamSize }),
      setUseCase: (useCase) => set({ useCase }),
      toggleTool: (toolId) =>
        set((state) => {
          const isSelected = state.selectedTools.includes(toolId);

          if (isSelected) {
            const nextEntries = { ...state.toolEntries };
            delete nextEntries[toolId];

            return {
              selectedTools: state.selectedTools.filter((id) => id !== toolId),
              toolEntries: nextEntries,
            };
          }

          return {
            selectedTools: [...state.selectedTools, toolId],
          };
        }),
      setToolEntry: (toolId, entry) =>
        set((state) => ({
          toolEntries: {
            ...state.toolEntries,
            [toolId]: {
              planId: state.toolEntries[toolId]?.planId ?? '',
              seats: state.toolEntries[toolId]?.seats ?? state.teamSize,
              monthlySpend: state.toolEntries[toolId]?.monthlySpend ?? 0,
              ...entry,
            },
          },
        })),
      resetForm: () => set({ ...initialState }),
    }),
    {
      name: 'spendly-audit-form',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
