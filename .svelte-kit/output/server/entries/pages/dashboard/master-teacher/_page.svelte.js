import { h as head, e as ensure_array_like, g as escape_html, d as attr_class, f as stringify } from "../../../../chunks/index2.js";
import "clsx";
import "../../../../chunks/supabase.js";
import { o as onDestroy } from "../../../../chunks/index-server.js";
import { D as DrillDownModal } from "../../../../chunks/DrillDownModal.js";
import { g as getComplianceBgClass, a as getComplianceClass } from "../../../../chunks/useDashboardData.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let showModal = false;
    let modalTitle = "";
    let modalTeachers = [];
    onDestroy(() => {
    });
    head("b7htdt", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Coaching Hub — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div><div class="mb-10"><h1 class="text-3xl font-black text-text-primary tracking-tight">Coaching Hub</h1> <p class="text-base text-text-secondary mt-1">Monitor performance, identify gaps, and drive institutional improvement</p></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
      const each_array = ensure_array_like(Array(4));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="glass-card-static p-8 animate-pulse"><div class="h-4 bg-gray-200 rounded w-24 mb-4"></div> <div class="h-10 bg-gray-200 rounded w-16"></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    DrillDownModal($$renderer2, {
      isOpen: showModal,
      title: modalTitle,
      onClose: () => {
        showModal = false;
      },
      children: ($$renderer3) => {
        if (modalTeachers.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-center text-text-muted py-6">No teachers found</p>`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-gray-100"><th class="px-4 py-2 text-left text-xs font-semibold text-text-muted">Teacher</th><th class="px-3 py-2 text-center text-xs font-semibold text-text-muted">Compliant</th><th class="px-3 py-2 text-center text-xs font-semibold text-text-muted">Late</th><th class="px-3 py-2 text-center text-xs font-semibold text-text-muted">Non-compliant</th><th class="px-3 py-2 text-center text-xs font-semibold text-text-muted">Rate</th></tr></thead><tbody class="divide-y divide-gray-50"><!--[-->`);
          const each_array_3 = ensure_array_like(modalTeachers);
          for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
            let t = each_array_3[$$index_3];
            $$renderer3.push(`<tr class="hover:bg-white/30 transition-colors"><td class="px-4 py-2 font-medium text-text-primary">${escape_html(t.full_name)}</td><td class="px-3 py-2 text-center text-gov-green font-semibold">${escape_html(t.Compliant)}</td><td class="px-3 py-2 text-center text-gov-gold-dark font-semibold">${escape_html(t.Late)}</td><td class="px-3 py-2 text-center text-gov-red font-semibold">${escape_html(t.NonCompliant)}</td><td class="px-3 py-2 text-center"><span${attr_class(`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${stringify(getComplianceBgClass(t.rate))} ${stringify(getComplianceClass(t.rate))}`)}>${escape_html(t.rate)}%</span></td></tr>`);
          }
          $$renderer3.push(`<!--]--></tbody></table></div>`);
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
