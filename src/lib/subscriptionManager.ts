import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

class SubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries = 3;
  private retryDelay = 2000;
  private activeSubscriptions: Set<string> = new Set();
  private isInitialized = true;

  private async cleanupChannel(key: string): Promise<void> {
    const channel = this.channels.get(key);
    if (channel) {
      try {
        await channel.unsubscribe();
        await supabase.removeChannel(channel);
      } catch (error) {
        console.error(`Error cleaning up channel ${key}:`, error);
      }
      this.channels.delete(key);
    }
  }

  private getChannelConfig(table: string, filter?: string) {
    return {
      event: '*',
      schema: 'public',
      table,
      ...(filter ? { filter } : {})
    };
  }

  async subscribe(
    key: string,
    table: string,
    filter: string | undefined,
    onUpdate: () => Promise<void>
  ): Promise<void> {
    // Clean up existing subscription first
    await this.cleanupChannel(key);

    // Prevent duplicate subscriptions
    if (this.activeSubscriptions.has(key)) {
      console.log(`Subscription ${key} already active`);
      return;
    }

    this.activeSubscriptions.add(key);

    try {
      const channel = supabase.channel(key);
      
      channel.on('postgres_changes', 
        this.getChannelConfig(table, filter),
        async (payload) => {
          try {
            console.log(`Received update for ${key}`);
            await onUpdate();
          } catch (error) {
            console.error(`Update handler error for ${key}:`, error);
          }
        }
      ).on('error', (error) => {
        console.error(`Channel error for ${key}:`, error);
        this.handleRetry(key, table, filter, onUpdate, 0);
      });

      const status = await channel.subscribe();
      
      if (status === 'SUBSCRIBED') {
        this.channels.set(key, channel);
        console.log(`Successfully subscribed to ${key}`);
      } else {
        throw new Error(`Subscription failed: ${status}`);
      }
    } catch (error) {
      console.error(`Subscription error for ${key}:`, error);
      this.handleRetry(key, table, filter, onUpdate);
      this.activeSubscriptions.delete(key);
    }
  }

  private handleRetry(
    key: string,
    table: string,
    filter: string | undefined,
    onUpdate: () => Promise<void>,
    retryCount = 0
  ): void {
    if (retryCount >= this.maxRetries) {
      console.error(`Max retries reached for ${key}`);
      return;
    }

    const timeout = setTimeout(() => {
      console.log(`Retrying subscription for ${key} (attempt ${retryCount + 1})`);
      this.subscribe(key, table, filter, onUpdate)
        .catch(() => this.handleRetry(key, table, filter, onUpdate, retryCount + 1));
    }, this.retryDelay * Math.pow(2, retryCount));

    this.retryTimeouts.set(key, timeout);
  }

  async unsubscribe(key: string): Promise<void> {
    const channel = this.channels.get(key);
    if (channel) {
      await this.cleanupChannel(key);
    }
    const timeout = this.retryTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(key);
    }
    this.activeSubscriptions.delete(key);
  }

  async unsubscribeAll(): Promise<void> {
    try {
      const keys = Array.from(this.channels.keys());
      await Promise.all(keys.map(key => this.unsubscribe(key)));
      this.activeSubscriptions.clear();
    } catch (error) {
      console.error('Error unsubscribing from all channels:', error);
    }
  }
}

export const subscriptionManager = new SubscriptionManager();
