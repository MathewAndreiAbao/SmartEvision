import { h as head, g as escape_html, e as ensure_array_like } from "../../../../../chunks/index2.js";
import "clsx";
import "../../../../../chunks/supabase.js";
import { o as onDestroy } from "../../../../../chunks/index-server.js";
import { D as DrillDownModal } from "../../../../../chunks/DrillDownModal.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let kpi = {
      totalSchools: 0
    };
    let showModal = false;
    onDestroy(() => {
    });
    head("1thoarh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>District Monitoring — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-10"><div class="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><h1 class="text-3xl font-black text-text-primary tracking-tight">District Oversight</h1> <p class="text-base text-text-secondary mt-1 font-medium">Monitoring performance across <span class="font-bold text-gov-blue">${escape_html(kpi.totalSchools)} schools</span> in the district</p></div></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
      const each_array = ensure_array_like(Array(4));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="glass-card-static p-8 animate-pulse text-center"><div class="h-4 bg-gray-200 rounded w-24 mx-auto mb-4"></div> <div class="h-10 bg-gray-200 rounded w-16 mx-auto"></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    DrillDownModal($$renderer2, {
      isOpen: showModal,
      title: "School Details",
      onClose: () => showModal = false,
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
