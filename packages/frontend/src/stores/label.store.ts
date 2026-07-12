import { create } from 'zustand';
import type { VerificationResult } from '@shared/types';

interface LabelStore {
  currentResult: VerificationResult | null;
  isLoading: boolean;
  error: string | null;
  setCurrentResult: (result: VerificationResult | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;
}

export const useLabelStore = create<LabelStore>((set) => ({
  currentResult: null,
  isLoading: false,
  error: null,

  setCurrentResult: (result) => set({ currentResult: result }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearResult: () => set({ currentResult: null, error: null }),
}));
