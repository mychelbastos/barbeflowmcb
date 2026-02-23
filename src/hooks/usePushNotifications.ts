import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Type helpers for Push API (not in default TS lib)
type PushManagerAny = any;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export function usePushNotifications(tenantId: string | undefined) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>('loading');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus('unsupported');
      return;
    }

    checkCurrentStatus();
  }, [user, tenantId]);

  const checkCurrentStatus = useCallback(async () => {
    try {
      const permission = Notification.permission;
      if (permission === 'denied') {
        setStatus('denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription && user && tenantId) {
        // Check if this subscription is saved in our DB
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        setStatus(data ? 'subscribed' : 'unsubscribed');
      } else {
        setStatus('unsubscribed');
      }
    } catch {
      setStatus('unsubscribed');
    }
  }, [user, tenantId]);

  const subscribe = useCallback(async () => {
    if (!user || !tenantId || !VAPID_PUBLIC_KEY) return false;
    
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Unsubscribe existing first to avoid duplicates
      const existing = await (registration as any).pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
      });

      const key = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      if (!key || !auth) throw new Error('Failed to get push keys');

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // Save to database (upsert on endpoint)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          tenant_id: tenantId,
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth: authKey,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' });

      if (error) throw error;

      setStatus('subscribed');
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        // Remove from DB
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
        
        await subscription.unsubscribe();
      }

      setStatus('unsubscribed');
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { status, loading, subscribe, unsubscribe };
}
