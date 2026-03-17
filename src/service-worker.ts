/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

// ─── Cache Configuration ───────────────────────────────────────
const CACHE = `cache-${version}`;

const ASSETS = [
    ...build, // the app itself (JS, CSS, etc.)
    ...files  // everything in `static`
];

// ─── Install: Pre-cache all assets ─────────────────────────────
self.addEventListener('install', (event) => {
    async function addFilesToCache() {
        const cache = await caches.open(CACHE);

        // Robust caching: Try each asset individually so one 404 doesn't kill the whole SW
        const promises = ASSETS.map(async (url) => {
            try {
                await cache.add(url);
            } catch (err) {
                console.error(`[SW] Failed to cache asset: ${url}`, err);
            }
        });

        await Promise.all(promises);

        // Pre-cache the app shell (root page) for offline navigation
        // This is the SvelteKit app shell that the client-side router needs
        try {
            const rootResponse = await fetch('/', { cache: 'reload' });
            if (rootResponse.ok) {
                await cache.put('/', rootResponse);
                console.log('[SW] Pre-cached app shell (/)');
            }
        } catch (e) {
            console.warn('[SW] Failed to pre-cache app shell:', e);
        }
    }

    // Activate immediately
    (self as any).skipWaiting();
    event.waitUntil(addFilesToCache());
});

// ─── Activate: Clean old caches + claim clients ────────────────
self.addEventListener('activate', (event) => {
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key);
        }
    }

    // Take control of all clients immediately
    event.waitUntil(
        deleteOldCaches().then(() => (self as any).clients.claim())
    );
});

// ─── Fetch: Network-first with cache fallback ──────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isLocal = url.origin === self.location.origin;
    
    // Critical Third-Party Assets (CDNs) that we WANT to cache for mobile efficiency
    const isCriticalThirdParty = 
        url.hostname.includes('cdnjs.cloudflare.com') || 
        url.hostname.includes('fonts.googleapis.com') || 
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('unpkg.com');

    async function respond(): Promise<Response> {
        const cache = await caches.open(CACHE);

        // Strategy 1: Cache-first for build assets and critical third-party libs
        if ((isLocal && ASSETS.includes(url.pathname)) || isCriticalThirdParty) {
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;
            
            // If it's a critical third-party but not in cache, fetch and cache it
            if (isCriticalThirdParty) {
                try {
                    const response = await fetch(event.request);
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                } catch (e) {
                    // Fallback to whatever we have
                }
            }
        }

        // Strategy 2: Network-first for everything else
        try {
            const response = await fetch(event.request);

            if (!(response instanceof Response)) {
                throw new Error('Invalid response from fetch');
            }

            // Cache successful local responses for future offline use
            if (isLocal && response.status === 200) {
                cache.put(event.request, response.clone());
            }

            return response;
        } catch (err) {
            // Fallback to cache
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;

            if (event.request.mode === 'navigate') {
                const appShell = await cache.match('/');
                if (appShell) return appShell;
            }

            throw err;
        }
    }

    event.respondWith(respond());
});

// ─── Background Sync: Retry failed uploads ─────────────────────
self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-offline-uploads') {
        event.waitUntil(
            // Notify all clients to process their offline queues
            (self as any).clients.matchAll().then((clients: any[]) => {
                clients.forEach((client: any) => {
                    client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
                });
            })
        );
    }
});

// ─── Push Notifications (future-ready) ─────────────────────────
self.addEventListener('push', (event: any) => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'Smart E-VISION';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: data.tag || 'default',
        data: { url: data.url || '/dashboard' },
        actions: data.actions || [],
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ─── Notification Click: Open the relevant page ────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification as any).data?.url || '/dashboard';

    event.waitUntil(
        (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients: any[]) => {
            // Focus existing window if available
            for (const client of clients) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return (self as any).clients.openWindow(url);
        })
    );
});
