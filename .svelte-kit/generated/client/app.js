export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16')
];

export const server_loads = [];

export const dictionary = {
		"/": [3],
		"/auth/login": [4],
		"/dashboard": [5,[2]],
		"/dashboard/admin": [6,[2]],
		"/dashboard/analytics": [7,[2]],
		"/dashboard/archive": [8,[2]],
		"/dashboard/calendar": [9,[2]],
		"/dashboard/load": [10,[2]],
		"/dashboard/master-teacher": [11,[2]],
		"/dashboard/monitoring/district": [12,[2]],
		"/dashboard/monitoring/school": [13,[2]],
		"/dashboard/settings": [14,[2]],
		"/dashboard/upload": [15,[2]],
		"/verify/[hash]": [16]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';