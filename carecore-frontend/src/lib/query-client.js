import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClientInstance = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Skip if the component already provides its own onError handler —
      // it will show its own message. This prevents double-toasting.
      if (typeof mutation.options.onError === 'function') return;
      const message = error?.message || 'Operation failed. Please try again.';
      toast.error(message);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});