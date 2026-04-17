import * as server from '../entries/pages/dashboard/upload/_page.server.ts.js';

export const index = 14;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dashboard/upload/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/dashboard/upload/+page.server.ts";
export const imports = ["_app/immutable/nodes/14.C0tBVg2u.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/EUAg-nnf.js","_app/immutable/chunks/BxPNg_MM.js","_app/immutable/chunks/CbxepORg.js","_app/immutable/chunks/D3-tQMe3.js","_app/immutable/chunks/DJWw-pd5.js","_app/immutable/chunks/Dzl8iKtY.js","_app/immutable/chunks/C_IMCELu.js","_app/immutable/chunks/D_NmNFhw.js","_app/immutable/chunks/Nc5duZNF.js","_app/immutable/chunks/9aXyxLhy.js","_app/immutable/chunks/B_dxxZ-R.js","_app/immutable/chunks/DvrJU13l.js","_app/immutable/chunks/BcoDm6Ti.js"];
export const stylesheets = ["_app/immutable/assets/14.CejQfS6b.css"];
export const fonts = [];
