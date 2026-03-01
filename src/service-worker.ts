/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

// ─── Cache Configuration ───────────────────────────────────────
const CACHE = `cache-${version}`;
const OFFLINE_URL = '/offline';

const ASSETS = [
    ...build, // the app itself
    ...files  // everything in `static`
];

// ─── Install: Pre-cache all assets + offline page ──────────────
self.addEventListener('install', (event) => {
    async function addFilesToCache() {
        const cache = await caches.open(CACHE);
        await cache.addAll(ASSETS);

        // Cache an offline fallback HTML page
        try {
            const offlineResponse = new Response(
                `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Offline — Smart E-VISION</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(135deg, #f0f4ff 0%, #e8edf8 100%);
            color: #1a1a2e;
            padding: 2rem;
        }
        .container {
            text-align: center;
            max-width: 400px;
        }
        .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            border-radius: 1.25rem;
            background: linear-gradient(135deg, #0038A8, #002a7a);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
            font-weight: 800;
            box-shadow: 0 8px 32px rgba(0, 56, 168, 0.2);
        }
        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
        p { color: #555577; line-height: 1.6; margin-bottom: 1.5rem; }
        button {
            padding: 0.875rem 2rem;
            background: #0038A8;
            color: white;
            border: none;
            border-radius: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,56,168,0.3); }
        button:active { transform: translateY(0); }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">E</div>
        <h1>You're Offline</h1>
        <p>Don't worry — your queued uploads are saved and will sync automatically when your connection is restored.</p>
        <button onclick="window.location.reload()">Try Again</button>
    </div>
</body>
</html>`,
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
            await cache.put(OFFLINE_URL, offlineResponse);
        } catch (e) {
            console.warn('[SW] Failed to cache offline page:', e);
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
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (Supabase API, fonts CDN will handle themselves)
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    async function respond(): Promise<Response> {
        const cache = await caches.open(CACHE);

        // Strategy 1: Cache-first for build assets (immutable, hashed filenames)
        if (ASSETS.includes(url.pathname)) {
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;
        }

        // Strategy 2: Network-first for everything else (pages, API)
        try {
            const response = await fetch(event.request);

            if (!(response instanceof Response)) {
                throw new Error('Invalid response from fetch');
            }

            // Cache successful responses for future offline use
            if (response.status === 200) {
                cache.put(event.request, response.clone());
            }

            return response;
        } catch (err) {
            // Fallback to cache
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;

            // Last resort: serve offline page for navigation requests
            if (event.request.mode === 'navigate') {
                const offlinePage = await cache.match(OFFLINE_URL);
                if (offlinePage) return offlinePage;
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
