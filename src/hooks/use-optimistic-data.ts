import { useState, useCallback } from 'react';

interface OptimisticData<T extends { id: string }> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useOptimisticData<T extends { id: string }>(initialData: T[]) {
  const [state, setState] = useState<OptimisticData<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const optimisticUpdate = useCallback(async (
    updateFn: (currentData: T[]) => Promise<T[]>,
    itemId: string,
    optimisticItem: T
  ) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Create optimistic update
      const optimisticData = state.data.map(item =>
        item.id === itemId ? optimisticItem : item
      );
      setState(prev => ({ ...prev, data: optimisticData }));

      // Perform actual update
      const result = await updateFn(state.data);
      
      // Update with actual result
      setState(prev => ({ ...prev, data: result, loading: false }));
      
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Update failed'
      }));
      
      // Revert to original data on error
      throw error;
    }
  }, [state.data]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    optimisticUpdate,
    clearError,
  };
}
