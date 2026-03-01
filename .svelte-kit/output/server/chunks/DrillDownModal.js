import { j as attr, g as escape_html } from "./index2.js";
function DrillDownModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { isOpen, title, onClose, children } = $$props;
    if (isOpen) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto" role="dialog" aria-modal="true"${attr("aria-label", title)} tabindex="-1"><div class="glass-card-static w-full max-w-2xl animate-slide-up max-h-[80vh] flex flex-col" role="document"><div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0"><h2 class="text-lg font-bold text-text-primary">${escape_html(title)}</h2> <button class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-xl text-text-muted" aria-label="Close">Close</button></div> <div class="px-6 py-4 overflow-y-auto flex-1">`);
      children($$renderer2);
      $$renderer2.push(`<!----></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  DrillDownModal as D
};
