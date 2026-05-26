import { supabase } from './supabase';

/**
 * Handle Web Push Notification subscriptions.
 * Innovative Feature: Phase 4.2 implementation.
 * Uses native Push API + Notification API.
 */
/**
 * Handle Web Push Notification subscriptions.
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
        await sendLocalNotification('Smart E-VISION', 'Push notifications enabled! You will now receive compliance alerts.');

        return true;
    } catch (err) {
        console.error('Push registration failed:', err);
        return false;
    }
}

/**
 * Unsubscribe from Push Notifications.
 */
export async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator)) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({
                push_subscription: null
            }).eq('id', user.id);
        }

        return true;
    } catch (err) {
        console.error('Unsubscribe failed:', err);
        return false;
    }
}

/**
 * Send a test push notification.
 */
export async function sendTestNotification() {
    return sendLocalNotification(
        'Test Alert',
        'This is a real-time test of the Smart E-VISION notification system.'
    );
}

/**
 * Trigger a local system notification.
 * Uses Service Worker for maximum reliability on mobile/PWA.
 */
export async function sendLocalNotification(title: string, body: string) {
    if (!('Notification' in window)) return;

    // Request permission if not already granted
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') return;

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [100, 50, 100],
                data: {
                    url: window.location.origin + '/dashboard'
                }
            } as any);
        } else {
            new Notification(title, { body, icon: '/icon-192.png' });
        }
    } catch (err) {
        console.warn('[Notifications] Fallback to simple notification:', err);
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
