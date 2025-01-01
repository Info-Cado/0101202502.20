import { useEffect, useState } from 'react';
import { subscriptionManager } from '../lib/subscriptionManager';

interface UseRealtimeSubscriptionProps {
  channelName: string;
  table: string;
  filter?: string;
  onUpdate?: () => Promise<void>;
}

export function useRealtimeSubscription({
  channelName,
  table,
  filter,
  onUpdate
}: UseRealtimeSubscriptionProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!onUpdate) return;

    const subscribe = async () => {
      try {
        await subscriptionManager.subscribe(
          channelName,
          table,
          filter,
          onUpdate
        );
        setError(null);
      } catch (err) {
        setError('Failed to establish real-time connection');
      }
    };

    subscribe();

    return () => {
      subscriptionManager.unsubscribe(channelName);
    };
  }, [channelName, table, filter, onUpdate]);

  return { error };
}
