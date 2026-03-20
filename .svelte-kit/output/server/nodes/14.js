import * as server from '../entries/pages/dashboard/upload/_page.server.ts.js';

export const index = 14;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dashboard/upload/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/dashboard/upload/+page.server.ts";
export const imports = ["_app/immutable/nodes/14.DDAxn2Ga.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/7X6HYfud.js","_app/immutable/chunks/D75bhFSb.js","_app/immutable/chunks/Cy4Vfm9E.js","_app/immutable/chunks/BXl67725.js","_app/immutable/chunks/CU99aUMq.js","_app/immutable/chunks/CSvoVpkn.js","_app/immutable/chunks/CFjg9Lrg.js","_app/immutable/chunks/D_NmNFhw.js","_app/immutable/chunks/CJZIyIeg.js","_app/immutable/chunks/BjdnxPJu.js","_app/immutable/chunks/Bjiw2xvT.js","_app/immutable/chunks/Do8f_7XD.js","_app/immutable/chunks/C0_v2ssJ.js"];
export const stylesheets = ["_app/immutable/assets/14.CejQfS6b.css"];
export const fonts = [];
