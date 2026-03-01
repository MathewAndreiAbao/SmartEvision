import { s as sanitize_props, a as spread_props, b as slot, h as head } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/supabase.js";
/* empty css                                                         */
import "../../../../chunks/toast.js";
import { I as Icon } from "../../../../chunks/Icon.js";
function Scan_line($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M3 7V5a2 2 0 0 1 2-2h2" }],
    ["path", { "d": "M17 3h2a2 2 0 0 1 2 2v2" }],
    ["path", { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }],
    ["path", { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }],
    ["path", { "d": "M7 12h10" }]
  ];
  Icon($$renderer, spread_props([
    { name: "scan-line" },
    $$sanitized_props,
    {
      /**
       * @component @name ScanLine
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyA3VjVhMiAyIDAgMCAxIDItMmgyIiAvPgogIDxwYXRoIGQ9Ik0xNyAzaDJhMiAyIDAgMCAxIDIgMnYyIiAvPgogIDxwYXRoIGQ9Ik0yMSAxN3YyYTIgMiAwIDAgMS0yIDJoLTIiIC8+CiAgPHBhdGggZD0iTTcgMjFINWEyIDIgMCAwIDEtMi0ydi0yIiAvPgogIDxwYXRoIGQ9Ik03IDEyaDEwIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/scan-line
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("1nolav9", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Verify Document — Smart E-VISION</title>`);
      });
    });
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="min-h-screen gradient-mesh flex items-center justify-center p-6"><div class="w-full max-w-lg animate-slide-up"><div class="text-center mb-8"><div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gov-blue to-gov-blue-dark flex items-center justify-center text-white text-2xl font-bold shadow-elevated mb-3">E</div> <h1 class="text-xl font-bold text-text-primary">Smart E-VISION</h1> <p class="text-sm text-text-muted">Document Verification</p></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="glass-card-static p-12 text-center" role="status" aria-label="Loading verification"><div class="w-12 h-12 border-4 border-gov-blue/20 border-t-gov-blue rounded-full animate-spin mx-auto mb-4"></div> <p class="text-text-muted font-bold uppercase tracking-widest text-xs">Authenticating Hash...</p></div>`);
    }
    $$renderer2.push(`<!--]--> <div class="flex flex-col gap-3 mt-6"><button class="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all min-h-[48px]" aria-label="Scan another QR code to verify a different document">`);
    Scan_line($$renderer2, { size: 18 });
    $$renderer2.push(`<!----> Scan Another Document</button> <a href="/dashboard" class="block text-center text-sm text-text-muted hover:text-gov-blue transition-colors py-2">BACK TO Smart E-VISION</a></div></div></div>`);
  });
}
export {
  _page as default
};
