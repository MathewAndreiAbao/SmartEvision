import { h as head, e as ensure_array_like } from "../../../../chunks/index2.js";
import "../../../../chunks/supabase.js";
import "clsx";
import "../../../../chunks/toast.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("1g84nau", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Teaching Load — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div><div class="mb-8 flex items-start justify-between"><div><h1 class="text-2xl font-bold text-text-primary">Teaching Load</h1> <p class="text-base text-text-secondary mt-1">Manage your subjects and grade levels</p></div> <button class="px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[48px] flex items-center gap-2">+ Add Load</button></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="space-y-3"><!--[-->`);
      const each_array = ensure_array_like(Array(3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="glass-card-static p-5 animate-pulse"><div class="h-4 bg-gray-200 rounded w-1/3"></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
