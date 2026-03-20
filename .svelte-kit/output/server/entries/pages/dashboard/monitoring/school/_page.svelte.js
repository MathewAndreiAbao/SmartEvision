import { s as sanitize_props, a as spread_props, b as slot, d as attr_class, f as stringify, g as escape_html, k as derived, h as head, c as store_get, e as ensure_array_like, u as unsubscribe_stores } from "../../../../../chunks/index2.js";
import { p as profile } from "../../../../../chunks/auth.js";
import { s as supabase } from "../../../../../chunks/supabase.js";
import { S as Search } from "../../../../../chunks/search.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { C as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { o as onDestroy } from "../../../../../chunks/index-server.js";
import { D as DrillDownModal } from "../../../../../chunks/DrillDownModal.js";
import { P as ProfileUploader } from "../../../../../chunks/ProfileUploader.js";
import { a as addToast } from "../../../../../chunks/toast.js";
function Circle_check($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["path", { "d": "m9 12 2 2 4-4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-check" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleCheck
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJtOSAxMiAyIDIgNC00IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/circle-check
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
function Clock($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["path", { "d": "M12 6v6l4 2" }]
  ];
  Icon($$renderer, spread_props([
    { name: "clock" },
    $$sanitized_props,
    {
      /**
       * @component @name Clock
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJNMTIgNnY2bDQgMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/clock
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
function Loader_circle($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [["path", { "d": "M21 12a9 9 0 1 1-6.219-8.56" }]];
  Icon($$renderer, spread_props([
    { name: "loader-circle" },
    $$sanitized_props,
    {
      /**
       * @component @name LoaderCircle
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEgMTJhOSA5IDAgMSAxLTYuMjE5LTguNTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/loader-circle
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
function School($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M14 21v-3a2 2 0 0 0-4 0v3" }],
    ["path", { "d": "M18 5v16" }],
    ["path", { "d": "m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" }],
    [
      "path",
      {
        "d": "m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"
      }
    ],
    ["path", { "d": "M6 5v16" }],
    ["circle", { "cx": "12", "cy": "9", "r": "2" }]
  ];
  Icon($$renderer, spread_props([
    { name: "school" },
    $$sanitized_props,
    {
      /**
       * @component @name School
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTQgMjF2LTNhMiAyIDAgMCAwLTQgMHYzIiAvPgogIDxwYXRoIGQ9Ik0xOCA1djE2IiAvPgogIDxwYXRoIGQ9Im00IDYgNy4xMDYtMy43OWEyIDIgMCAwIDEgMS43ODggMEwyMCA2IiAvPgogIDxwYXRoIGQ9Im02IDExLTMuNTIgMi4xNDdhMSAxIDAgMCAwLS40OC44NTRWMTlhMiAyIDAgMCAwIDIgMmgxNmEyIDIgMCAwIDAgMi0ydi01YTEgMSAwIDAgMC0uNDgtLjg1M0wxOCAxMSIgLz4KICA8cGF0aCBkPSJNNiA1djE2IiAvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iOSIgcj0iMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/school
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
function StatusBadge($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { status, size = "md" } = $$props;
    const config = {
      compliant: {
        bg: "bg-gov-green/10",
        text: "text-gov-green",
        border: "border-gov-green/30",
        label: "Compliant",
        icon: Circle_check
      },
      late: {
        bg: "bg-gov-gold/10",
        text: "text-gov-gold-dark",
        border: "border-gov-gold/40",
        label: "Late",
        icon: Clock
      },
      "non-compliant": {
        bg: "bg-gov-red/10",
        text: "text-gov-red",
        border: "border-gov-red/30",
        label: "Non-Compliant",
        icon: Circle_alert
      },
      pending: {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
        label: "Pending",
        icon: Loader_circle
      },
      review: {
        bg: "bg-gov-blue/10",
        text: "text-gov-blue",
        border: "border-gov-blue/30",
        label: "Under Review",
        icon: Search
      }
    };
    const normalizedStatus = derived(() => () => {
      if (!status) return "pending";
      const s = status.toLowerCase();
      if (s === "compliant" || s === "on-time") return "compliant";
      if (s === "late") return "late";
      if (s === "non-compliant" || s === "non compliant" || s === "missing") return "non-compliant";
      if (s === "pending") return "pending";
      if (s === "review" || s === "under review") return "review";
      return s;
    });
    const c = derived(() => config[normalizedStatus()()] || config.pending);
    const IconComponent = derived(() => c().icon);
    const sizeClass = derived(() => size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5");
    $$renderer2.push(`<span${attr_class(`inline-flex items-center gap-1 rounded border font-medium ${stringify(c().bg)} ${stringify(c().text)} ${stringify(c().border)} ${stringify(sizeClass())}`)}>`);
    if (IconComponent()) {
      $$renderer2.push("<!--[-->");
      IconComponent()($$renderer2, { size: size === "sm" ? 11 : 13 });
      $$renderer2.push("<!--]-->");
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push("<!--]-->");
    }
    $$renderer2.push(` ${escape_html(c().label)}</span>`);
  });
}
function countSubmissionsByStatus(submissions) {
  let compliant = 0;
  let late = 0;
  let nonCompliant = 0;
  for (const s of submissions) {
    const cs = (s.compliance_status || "non-compliant").toLowerCase().trim();
    if (cs === "compliant" || cs === "on-time") {
      compliant++;
    } else if (cs === "late") {
      late++;
    } else {
      nonCompliant++;
    }
  }
  return { compliant, late, nonCompliant, total: compliant + late + nonCompliant };
}
function calculateCompliance(submissions, expectedTotal = 0) {
  const counts = countSubmissionsByStatus(submissions);
  const actualUploads = counts.compliant + counts.late;
  const nonCompliant = Math.max(0, expectedTotal - actualUploads);
  const rate = expectedTotal > 0 ? Math.min(100, Math.round(actualUploads / expectedTotal * 100)) : 0;
  return {
    Compliant: counts.compliant,
    Late: counts.late,
    NonCompliant: nonCompliant,
    totalUploaded: counts.total,
    expected: expectedTotal,
    rate
  };
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let schoolLogoUrl = null;
    let showModal = false;
    let selectedTeacher = null;
    let selectedSubmissions = [];
    onDestroy(() => {
    });
    function formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("d819pb", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>School Monitoring — Smart E-VISION</title>`);
        });
      });
      $$renderer3.push(`<div><div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6"><div><h1 class="text-2xl font-bold text-text-primary">School Compliance Monitor</h1> <p class="text-base text-text-secondary mt-1">Track teacher submissions and compliance rates</p></div> `);
      if (store_get($$store_subs ??= {}, "$profile", profile)?.role === "School Head" && store_get($$store_subs ??= {}, "$profile", profile)?.school_id) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">`);
        ProfileUploader($$renderer3, {
          id: store_get($$store_subs ??= {}, "$profile", profile).school_id,
          bucket: "avatars",
          path: "schools",
          label: "School Logo",
          size: "md",
          placeholderIcon: School,
          onUpload: async (newUrl) => {
            await supabase.from("schools").update({ avatar_url: newUrl }).eq("id", store_get($$store_subs ??= {}, "$profile", profile)?.school_id || "");
            addToast("success", "School logo updated");
          },
          get url() {
            return schoolLogoUrl;
          },
          set url($$value) {
            schoolLogoUrl = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----> <div class="hidden sm:block"><h4 class="text-sm font-bold text-text-primary uppercase tracking-tight">School Branding</h4> <p class="text-[10px] text-text-muted font-medium">Official Institutional Logo</p></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
        const each_array = ensure_array_like(Array(4));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          each_array[$$index];
          $$renderer3.push(`<div class="gov-card-static p-6 animate-pulse"><div class="h-4 bg-gray-200 rounded w-24 mb-3"></div> <div class="h-8 bg-gray-200 rounded w-16"></div></div>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      DrillDownModal($$renderer3, {
        isOpen: showModal,
        title: selectedTeacher ? `Submissions: ${selectedTeacher.full_name}` : "Teacher Details",
        onClose: () => {
          showModal = false;
          selectedTeacher = null;
        },
        children: ($$renderer4) => {
          if (selectedTeacher) {
            $$renderer4.push("<!--[-->");
            const stats = calculateCompliance(selectedSubmissions);
            $$renderer4.push(`<div class="grid grid-cols-3 gap-3 mb-4"><div class="text-center p-3 rounded-xl bg-gov-green/10"><p class="text-lg font-bold text-gov-green">${escape_html(stats.Compliant)}</p> <p class="text-xs text-text-muted">Compliant</p></div> <div class="text-center p-3 rounded-xl bg-gov-gold/10"><p class="text-lg font-bold text-gov-gold-dark">${escape_html(stats.Late)}</p> <p class="text-xs text-text-muted">Late</p></div> <div class="text-center p-3 rounded-xl bg-gov-red/10"><p class="text-lg font-bold text-gov-red">${escape_html(stats.NonCompliant)}</p> <p class="text-xs text-text-muted">Non-compliant</p></div></div> `);
            if (selectedSubmissions.length === 0) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`<p class="text-center text-text-muted py-6">No submissions found</p>`);
            } else {
              $$renderer4.push("<!--[!-->");
              $$renderer4.push(`<div class="divide-y divide-gray-100"><!--[-->`);
              const each_array_3 = ensure_array_like(selectedSubmissions);
              for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                let sub = each_array_3[$$index_3];
                const tl = Array.isArray(sub.teaching_loads) ? sub.teaching_loads[0] : sub.teaching_loads;
                $$renderer4.push(`<div class="flex items-center justify-between py-3"><div class="min-w-0"><p class="text-sm font-medium text-text-primary truncate">${escape_html(sub.file_name)}</p> <p class="text-xs text-text-muted">${escape_html(sub.doc_type)} `);
                if (tl) {
                  $$renderer4.push("<!--[-->");
                  $$renderer4.push(`- ${escape_html(tl.subject)} - Gr. ${escape_html(tl.grade_level)}`);
                } else {
                  $$renderer4.push("<!--[!-->");
                }
                $$renderer4.push(`<!--]--></p></div> <div class="flex items-center gap-3 flex-shrink-0">`);
                StatusBadge($$renderer4, {
                  status: sub.compliance_status === "on-time" || sub.compliance_status === "compliant" ? "compliant" : sub.compliance_status === "late" ? "late" : "non-compliant",
                  size: "sm"
                });
                $$renderer4.push(`<!----> <span class="text-xs text-text-muted">${escape_html(formatDate(sub.created_at))}</span></div></div>`);
              }
              $$renderer4.push(`<!--]--></div>`);
            }
            $$renderer4.push(`<!--]-->`);
          } else {
            $$renderer4.push("<!--[!-->");
          }
          $$renderer4.push(`<!--]-->`);
        }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
