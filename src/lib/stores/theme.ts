import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function createThemeStore() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('cedims-theme') : null;
    const initial: Theme = stored === 'dark' ? 'dark' : 'light';

    const { subscribe, set, update } = writable<Theme>(initial);

    return {
        subscribe,
        toggle: () => update(t => {
            const next = t === 'light' ? 'dark' : 'light';
            localStorage.setItem('cedims-theme', next);
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('dark', next === 'dark');
            }
            return next;
        }),
        set: (theme: Theme) => {
            localStorage.setItem('cedims-theme', theme);
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('dark', theme === 'dark');
            }
            set(theme);
        },
        init: () => {
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('dark', initial === 'dark');
            }
        }
    };
}

export const theme = createThemeStore();
