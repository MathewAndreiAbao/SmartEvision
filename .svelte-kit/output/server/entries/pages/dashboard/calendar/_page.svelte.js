import { h as head, e as ensure_array_like } from "../../../../chunks/index2.js";
import "clsx";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toast.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let schoolYear = "2025-2026";
    let quarter = 1;
    head("140v80w", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Academic Calendar — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div class="max-w-4xl mx-auto"><div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"><div><h1 class="text-3xl font-black text-text-primary tracking-tight">Academic Calendar</h1> <p class="text-base text-text-secondary mt-1 font-medium max-w-lg">Manage submission deadlines and institutional timeline for the
                current school year.</p></div> <div class="flex items-center gap-3 p-1.5 bg-surface-muted rounded-2xl border border-border-subtle shadow-sm">`);
    $$renderer2.select(
      {
        value: schoolYear,
        class: "px-4 py-2 bg-transparent border-none rounded-xl focus:ring-0 outline-none text-sm font-bold text-gov-blue cursor-pointer"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "2024-2025" }, ($$renderer4) => {
          $$renderer4.push(`2024-2025`);
        });
        $$renderer3.option({ value: "2025-2026" }, ($$renderer4) => {
          $$renderer4.push(`2025-2026`);
        });
      }
    );
    $$renderer2.push(` <div class="w-px h-4 bg-border-subtle"></div> `);
    $$renderer2.select(
      {
        value: quarter,
        class: "px-4 py-2 bg-transparent border-none rounded-xl focus:ring-0 outline-none text-sm font-bold text-gov-blue cursor-pointer"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: 1 }, ($$renderer4) => {
          $$renderer4.push(`1st Quarter`);
        });
        $$renderer3.option({ value: 2 }, ($$renderer4) => {
          $$renderer4.push(`2nd Quarter`);
        });
        $$renderer3.option({ value: 3 }, ($$renderer4) => {
          $$renderer4.push(`3rd Quarter`);
        });
        $$renderer3.option({ value: 4 }, ($$renderer4) => {
          $$renderer4.push(`4th Quarter`);
        });
      }
    );
    $$renderer2.push(`</div></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><!--[-->`);
      const each_array = ensure_array_like(Array(6));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="glass-card-static p-8 h-36 animate-pulse"></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
