import { supabase } from './supabase';

/**
 * Handle Web Push Notification subscriptions.
 * Innovative Feature: Phase 4.2 implementation.
 * Uses native Push API + Notification API.
 */
export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported in this browser');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // 1. Request User Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return false;
        }

        // 2. Subscribe to Push Manager
        // Note: In production, generate VAPID keys. For Capstone Demo, use placeholder.
        const VAPID_PUBLIC_KEY = 'BI7C2b_G5S8q0VXR_p6mJRg6V9i_x6Z9V8n3_V8V8V8V8V8V8V8V8V8V8V8V8V8V8V8V8V8V8V8V8';

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // 3. Store subscription in Supabase Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({
                push_subscription: subscription
            }).eq('id', user.id);
        }

        // 4. Test Notification (Local)
        new Notification('Smart E-VISION', {
            body: 'Push notifications enabled! You will now receive compliance alerts.',
            icon: '/icon-192.png'
        });

        return true;
    } catch (err) {
        console.error('Push registration failed:', err);
        return false;
    }
}

/**
 * Trigger a local system notification.
 * Works even if push server isn't fully configured.
 */
export function sendLocalNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' });
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
