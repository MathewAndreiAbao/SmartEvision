
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/convert" | "/auth" | "/auth/login" | "/dashboard" | "/dashboard/admin" | "/dashboard/analytics" | "/dashboard/archive" | "/dashboard/calendar" | "/dashboard/load" | "/dashboard/master-teacher" | "/dashboard/monitoring" | "/dashboard/monitoring/district" | "/dashboard/monitoring/school" | "/dashboard/settings" | "/dashboard/upload" | "/verify" | "/verify/[hash]";
		RouteParams(): {
			"/verify/[hash]": { hash: string }
		};
		LayoutParams(): {
			"/": { hash?: string };
			"/api": Record<string, never>;
			"/api/convert": Record<string, never>;
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/dashboard/admin": Record<string, never>;
			"/dashboard/analytics": Record<string, never>;
			"/dashboard/archive": Record<string, never>;
			"/dashboard/calendar": Record<string, never>;
			"/dashboard/load": Record<string, never>;
			"/dashboard/master-teacher": Record<string, never>;
			"/dashboard/monitoring": Record<string, never>;
			"/dashboard/monitoring/district": Record<string, never>;
			"/dashboard/monitoring/school": Record<string, never>;
			"/dashboard/settings": Record<string, never>;
			"/dashboard/upload": Record<string, never>;
			"/verify": { hash?: string };
			"/verify/[hash]": { hash: string }
		};
		Pathname(): "/" | "/auth/login" | "/dashboard" | "/dashboard/admin" | "/dashboard/analytics" | "/dashboard/archive" | "/dashboard/calendar" | "/dashboard/load" | "/dashboard/master-teacher" | "/dashboard/monitoring/district" | "/dashboard/monitoring/school" | "/dashboard/settings" | "/dashboard/upload" | `/verify/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/apple-touch-icon.png" | "/favicon.png" | "/icon-192.png" | "/icon-512.png" | "/manifest.json" | "/robots.txt" | string & {};
	}
}