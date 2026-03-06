import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/utils/supabase';
import { addToast } from './toast';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    created_at: string;
    link?: string;
}

function createNotificationStore() {
    const { subscribe, set, update } = writable<Notification[]>([]);
    let userId: string | null = null;
    let channel: any = null;

    return {
        subscribe,
        init: async (id: string) => {
            userId = id;

            // 1. Fetch initial notifications
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                set(data);
            }

            // 2. Setup Real-time listener
            if (channel) supabase.removeChannel(channel);

            channel = supabase
                .channel(`user-notifications-${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        const newNotif = payload.new as Notification;
                        update(n => [newNotif, ...n]);

                        // Show a global toast for new notifications
                        addToast(newNotif.type, `${newNotif.title}: ${newNotif.message}`);

                        // Play a subtle sound or trigger haptic if needed
                        if ('vibrate' in navigator) navigator.vibrate(50);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        update(n => n.map(item => item.id === payload.new.id ? payload.new as Notification : item));
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        update(n => n.filter(item => item.id !== payload.old.id));
                    }
                )
                .subscribe();
        },
        markAsRead: async (notificationId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (!error) {
                update(n => n.map(item => item.id === notificationId ? { ...item, read: true } : item));
            }
        },
        markAllAsRead: async () => {
            if (!userId) return;
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (!error) {
                update(n => n.map(item => ({ ...item, read: true })));
            }
        },
        clear: () => {
            if (channel) supabase.removeChannel(channel);
            set([]);
        }
    };
}

export const notifications = createNotificationStore();

export const unreadCount = derived(notifications, ($notifications) =>
    $notifications.filter(n => !n.read).length
);
