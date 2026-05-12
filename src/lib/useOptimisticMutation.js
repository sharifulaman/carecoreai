import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Reusable hook for optimistic UI updates with React Query.
 * Automatically updates cache before server call, reverts on error.
 * @param {Object} options
 * @param {Function} options.mutationFn - Async function to call server
 * @param {string[]} options.invalidateKeys - Query keys to invalidate on error
 * @param {Function} options.updateCache - Function to update cache optimistically: (prev, variables) => newState
 * @param {string} options.successMsg - Success toast message
 * @param {string} options.errorMsg - Error toast message
 */
export function useOptimisticMutation({
  mutationFn,
  invalidateKeys = [],
  updateCache,
  successMsg = "Updated",
  errorMsg = "Failed to update",
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: (variables) => {
      if (updateCache) {
        // Store previous state for rollback
        const previousData = {};
        invalidateKeys.forEach(key => {
          previousData[key] = qc.getQueryData(key);
        });
        
        // Optimistic update
        invalidateKeys.forEach(key => {
          qc.setQueryData(key, prev => updateCache(prev, variables));
        });
        
        return previousData;
      }
    },
    onSuccess: () => {
      toast.success(successMsg);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context) {
        Object.entries(context).forEach(([key, data]) => {
          qc.setQueryData(key.replace("key-", ""), data);
        });
      }
      invalidateKeys.forEach(key => {
        qc.invalidateQueries({ queryKey: key });
      });
      toast.error(errorMsg);
    },
  });
}