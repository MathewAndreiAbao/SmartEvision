import { s as sanitize_props, a as spread_props, b as slot, i as getContext, c as store_get, g as escape_html, j as attr, u as unsubscribe_stores, d as attr_class, e as ensure_array_like, f as stringify, k as derived, h as head } from "../../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { p as profile, a as authLoading, u as user } from "../../../chunks/auth.js";
import { w as writable } from "../../../chunks/index.js";
import "../../../chunks/supabase.js";
import "../../../chunks/toast.js";
import { s as showQRScanner } from "../../../chunks/ui.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { C as Chevron_right } from "../../../chunks/chevron-right.js";
import { S as Shield_check } from "../../../chunks/shield-check.js";
import { S as Settings } from "../../../chunks/settings.js";
import "../../../chunks/settings2.js";
function Archive($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "rect",
      { "width": "20", "height": "5", "x": "2", "y": "3", "rx": "1" }
    ],
    ["path", { "d": "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }],
    ["path", { "d": "M10 12h4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "archive" },
    $$sanitized_props,
    {
      /**
       * @component @name Archive
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iNSIgeD0iMiIgeT0iMyIgcng9IjEiIC8+CiAgPHBhdGggZD0iTTQgOHYxMWEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOCIgLz4KICA8cGF0aCBkPSJNMTAgMTJoNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/archive
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
function Briefcase($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      { "d": "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" }
    ],
    [
      "rect",
      { "width": "20", "height": "14", "x": "2", "y": "6", "rx": "2" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "briefcase" },
    $$sanitized_props,
    {
      /**
       * @component @name Briefcase
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTYgMjBWNGEyIDIgMCAwIDAtMi0yaC00YTIgMiAwIDAgMC0yIDJ2MTYiIC8+CiAgPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiB4PSIyIiB5PSI2IiByeD0iMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/briefcase
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
function Calendar($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M8 2v4" }],
    ["path", { "d": "M16 2v4" }],
    [
      "rect",
      { "width": "18", "height": "18", "x": "3", "y": "4", "rx": "2" }
    ],
    ["path", { "d": "M3 10h18" }]
  ];
  Icon($$renderer, spread_props([
    { name: "calendar" },
    $$sanitized_props,
    {
      /**
       * @component @name Calendar
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOCAydjQiIC8+CiAgPHBhdGggZD0iTTE2IDJ2NCIgLz4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjQiIHJ4PSIyIiAvPgogIDxwYXRoIGQ9Ik0zIDEwaDE4IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/calendar
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
function Cloud_upload($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M12 13v8" }],
    [
      "path",
      {
        "d": "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
      }
    ],
    ["path", { "d": "m8 17 4-4 4 4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "cloud-upload" },
    $$sanitized_props,
    {
      /**
       * @component @name CloudUpload
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgMTN2OCIgLz4KICA8cGF0aCBkPSJNNCAxNC44OTlBNyA3IDAgMSAxIDE1LjcxIDhoMS43OWE0LjUgNC41IDAgMCAxIDIuNSA4LjI0MiIgLz4KICA8cGF0aCBkPSJtOCAxNyA0LTQgNCA0IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/cloud-upload
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
function Layout_dashboard($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "rect",
      { "width": "7", "height": "9", "x": "3", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "14", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "9", "x": "14", "y": "12", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "3", "y": "16", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "layout-dashboard" },
    $$sanitized_props,
    {
      /**
       * @component @name LayoutDashboard
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI5IiB4PSIzIiB5PSIzIiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI1IiB4PSIxNCIgeT0iMyIgcng9IjEiIC8+CiAgPHJlY3Qgd2lkdGg9IjciIGhlaWdodD0iOSIgeD0iMTQiIHk9IjEyIiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI1IiB4PSIzIiB5PSIxNiIgcng9IjEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/layout-dashboard
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
function Map($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
      }
    ],
    ["path", { "d": "M15 5.764v15" }],
    ["path", { "d": "M9 3.236v15" }]
  ];
  Icon($$renderer, spread_props([
    { name: "map" },
    $$sanitized_props,
    {
      /**
       * @component @name Map
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTQuMTA2IDUuNTUzYTIgMiAwIDAgMCAxLjc4OCAwbDMuNjU5LTEuODNBMSAxIDAgMCAxIDIxIDQuNjE5djEyLjc2NGExIDEgMCAwIDEtLjU1My44OTRsLTQuNTUzIDIuMjc3YTIgMiAwIDAgMS0xLjc4OCAwbC00LjIxMi0yLjEwNmEyIDIgMCAwIDAtMS43ODggMGwtMy42NTkgMS44M0ExIDEgMCAwIDEgMyAxOS4zODFWNi42MThhMSAxIDAgMCAxIC41NTMtLjg5NGw0LjU1My0yLjI3N2EyIDIgMCAwIDEgMS43ODggMHoiIC8+CiAgPHBhdGggZD0iTTE1IDUuNzY0djE1IiAvPgogIDxwYXRoIGQ9Ik05IDMuMjM2djE1IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/map
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
function Menu($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M4 5h16" }],
    ["path", { "d": "M4 12h16" }],
    ["path", { "d": "M4 19h16" }]
  ];
  Icon($$renderer, spread_props([
    { name: "menu" },
    $$sanitized_props,
    {
      /**
       * @component @name Menu
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCA1aDE2IiAvPgogIDxwYXRoIGQ9Ik00IDEyaDE2IiAvPgogIDxwYXRoIGQ9Ik00IDE5aDE2IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/menu
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
function Qr_code($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "rect",
      { "width": "5", "height": "5", "x": "3", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "5", "height": "5", "x": "16", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "5", "height": "5", "x": "3", "y": "16", "rx": "1" }
    ],
    ["path", { "d": "M21 16h-3a2 2 0 0 0-2 2v3" }],
    ["path", { "d": "M21 21v.01" }],
    ["path", { "d": "M12 7v3a2 2 0 0 1-2 2H7" }],
    ["path", { "d": "M3 12h.01" }],
    ["path", { "d": "M12 3h.01" }],
    ["path", { "d": "M12 16v.01" }],
    ["path", { "d": "M16 12h1" }],
    ["path", { "d": "M21 12v.01" }],
    ["path", { "d": "M12 21v-1" }]
  ];
  Icon($$renderer, spread_props([
    { name: "qr-code" },
    $$sanitized_props,
    {
      /**
       * @component @name QrCode
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiB4PSIzIiB5PSIzIiByeD0iMSIgLz4KICA8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiB4PSIxNiIgeT0iMyIgcng9IjEiIC8+CiAgPHJlY3Qgd2lkdGg9IjUiIGhlaWdodD0iNSIgeD0iMyIgeT0iMTYiIHJ4PSIxIiAvPgogIDxwYXRoIGQ9Ik0yMSAxNmgtM2EyIDIgMCAwIDAtMiAydjMiIC8+CiAgPHBhdGggZD0iTTIxIDIxdi4wMSIgLz4KICA8cGF0aCBkPSJNMTIgN3YzYTIgMiAwIDAgMS0yIDJINyIgLz4KICA8cGF0aCBkPSJNMyAxMmguMDEiIC8+CiAgPHBhdGggZD0iTTEyIDNoLjAxIiAvPgogIDxwYXRoIGQ9Ik0xMiAxNnYuMDEiIC8+CiAgPHBhdGggZD0iTTE2IDEyaDEiIC8+CiAgPHBhdGggZD0iTTIxIDEydi4wMSIgLz4KICA8cGF0aCBkPSJNMTIgMjF2LTEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/qr-code
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
function Trending_up($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M16 7h6v6" }],
    ["path", { "d": "m22 7-8.5 8.5-5-5L2 17" }]
  ];
  Icon($$renderer, spread_props([
    { name: "trending-up" },
    $$sanitized_props,
    {
      /**
       * @component @name TrendingUp
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTYgN2g2djYiIC8+CiAgPHBhdGggZD0ibTIyIDctOC41IDguNS01LTVMMiAxNyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/trending-up
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
const pendingSyncCount = writable(0);
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function SyncStatus($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let isSyncing = false;
    if (store_get($$store_subs ??= {}, "$pendingSyncCount", pendingSyncCount) > 0 || false) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-auto pt-6 border-t border-gray-100 px-2"><div class="glass-card-static p-4 space-y-3"><div class="flex items-center justify-between"><span class="text-[14px] font-medium text-text-primary flex items-center gap-2">${escape_html("Online")}</span> `);
      if (store_get($$store_subs ??= {}, "$pendingSyncCount", pendingSyncCount) > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="px-2 py-0.5 bg-gov-blue/10 text-gov-blue text-[12px] font-bold rounded-full">${escape_html(store_get($$store_subs ??= {}, "$pendingSyncCount", pendingSyncCount))} pending</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      if (store_get($$store_subs ??= {}, "$pendingSyncCount", pendingSyncCount) > 0) {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<button${attr("disabled", isSyncing, true)} class="w-full py-2.5 bg-gov-blue text-white rounded-xl text-[14px] font-bold hover:bg-gov-blue-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2">`);
        {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`Sync Now`);
        }
        $$renderer2.push(`<!--]--></button>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const navItems = [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: Layout_dashboard,
        mobileNav: true,
        roles: [
          "Teacher",
          "School Head",
          "Master Teacher",
          "District Supervisor"
        ]
      },
      {
        href: "/dashboard/calendar",
        label: "Calendar",
        icon: Calendar,
        mobileNav: true,
        roles: [
          "Teacher",
          "School Head",
          "Master Teacher",
          "District Supervisor"
        ]
      },
      {
        href: "/dashboard/upload",
        label: "Upload",
        icon: Cloud_upload,
        mobileNav: true,
        roles: ["Teacher"]
      },
      {
        href: "/dashboard/archive",
        label: "Archive",
        icon: Archive,
        mobileNav: true,
        roles: [
          "Teacher",
          "School Head",
          "Master Teacher",
          "District Supervisor"
        ]
      },
      {
        href: "/dashboard/load",
        label: "Teaching Load",
        icon: Briefcase,
        roles: ["Teacher"]
      },
      {
        href: "/dashboard/monitoring/school",
        label: "School Monitor",
        icon: Shield_check,
        mobileNav: true,
        roles: ["School Head", "Master Teacher"]
      },
      {
        href: "/dashboard/monitoring/district",
        label: "District Monitor",
        icon: Map,
        mobileNav: true,
        roles: ["District Supervisor"]
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: Trending_up,
        roles: ["School Head", "Master Teacher", "District Supervisor"]
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        roles: [
          "Teacher",
          "School Head",
          "Master Teacher",
          "District Supervisor"
        ]
      },
      {
        href: "/dashboard/admin",
        label: "Admin Panel",
        icon: Shield_check,
        roles: ["District Supervisor"]
      },
      {
        href: "#scan",
        label: "Scan Document",
        icon: Qr_code,
        mobileNav: true,
        roles: [
          "Teacher",
          "School Head",
          "Master Teacher",
          "District Supervisor"
        ],
        onClick: (e) => {
          e.preventDefault();
          showQRScanner.set(true);
        }
      }
    ];
    const filteredItems = derived(() => navItems.filter((item) => {
      const currentRole = store_get($$store_subs ??= {}, "$profile", profile)?.role?.toLowerCase() || "";
      return item.roles.some((r) => currentRole.includes(r.toLowerCase().trim()));
    }));
    const mobileNavItems = derived(() => filteredItems().filter((item) => item.mobileNav).slice(0, 5));
    function isActive(href) {
      const currentPath = store_get($$store_subs ??= {}, "$page", page).url.pathname;
      if (href === "/dashboard") return currentPath === "/dashboard";
      return currentPath.startsWith(href);
    }
    $$renderer2.push(`<button class="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center rounded-2xl bg-gov-blue text-white shadow-lg active:scale-95 transition-all" aria-label="Toggle menu">`);
    {
      $$renderer2.push("<!--[!-->");
      Menu($$renderer2, { size: 24 });
    }
    $$renderer2.push(`<!--]--></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <aside${attr_class(`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-white border-r border-border-subtle shadow-xl transition-transform duration-500 ease-pop ${stringify("-translate-x-full")} lg:translate-x-0`)} role="navigation" aria-label="Main Sidebar Navigation"><a href="/dashboard" class="block p-8 mb-4 no-underline group" aria-label="Go to Dashboard"><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-2xl gov-header-gradient flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-gov-blue/20 group-hover:scale-105 transition-transform" aria-hidden="true">E</div> <div><h1 id="dashboard-title" class="text-lg font-black text-text-primary leading-none tracking-tighter">Smart E-VISION</h1> <p class="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">System Hub</p></div></div></a> <nav class="flex-1 px-4 overflow-y-auto" aria-label="Sidebar Menu"><ul class="space-y-2"><!--[-->`);
    const each_array = ensure_array_like(filteredItems());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      const Icon2 = item.icon;
      $$renderer2.push(`<li><a${attr("href", item.href)}${attr_class(`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${stringify(isActive(item.href) ? "bg-gov-blue text-white shadow-lg shadow-gov-blue/10" : "text-text-secondary hover:bg-surface-muted hover:text-gov-blue")}`)}${attr("aria-current", isActive(item.href) ? "page" : void 0)}><div class="flex items-center gap-3">`);
      if (Icon2) {
        $$renderer2.push("<!--[-->");
        Icon2($$renderer2, {
          size: 20,
          strokeWidth: isActive(item.href) ? 2.5 : 2,
          "aria-hidden": "true"
        });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
      $$renderer2.push(` <span>${escape_html(item.label)}</span></div> `);
      if (isActive(item.href)) {
        $$renderer2.push("<!--[-->");
        Chevron_right($$renderer2, { size: 16, "aria-hidden": "true" });
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></a></li>`);
    }
    $$renderer2.push(`<!--]--></ul></nav> `);
    if (store_get($$store_subs ??= {}, "$profile", profile)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="p-6 border-t border-border-subtle bg-surface-muted/30" role="contentinfo" aria-label="User Profile Summary"><div class="flex items-center gap-4 mb-4"><div class="w-11 h-11 rounded-2xl bg-gov-blue/10 flex items-center justify-center text-sm font-black text-gov-blue border-2 border-white shadow-sm" aria-hidden="true">${escape_html(store_get($$store_subs ??= {}, "$profile", profile).full_name?.charAt(0) || "?")}</div> <div class="flex-1 min-w-0"><p class="text-sm font-black text-text-primary truncate">${escape_html(store_get($$store_subs ??= {}, "$profile", profile).full_name)}</p> <p class="text-[10px] text-text-muted font-bold uppercase tracking-wider truncate">${escape_html(store_get($$store_subs ??= {}, "$profile", profile).role)}</p></div></div> `);
      SyncStatus($$renderer2);
      $$renderer2.push(`<!----></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></aside> <nav class="lg:hidden fixed bottom-6 left-6 right-6 z-40 glass-card-static border border-white/40 shadow-2xl" aria-label="Mobile Navigation Bar"><div class="flex items-center justify-around p-2"><!--[-->`);
    const each_array_1 = ensure_array_like(mobileNavItems());
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let item = each_array_1[$$index_1];
      const MobileIcon = item.icon;
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class(`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-h-[48px] min-w-[48px] ${stringify(isActive(item.href) ? "text-gov-blue bg-gov-blue/10 scale-110" : "text-text-muted hover:text-gov-blue")}`)}${attr("aria-current", isActive(item.href) ? "page" : void 0)}${attr("aria-label", item.label)}>`);
      if (MobileIcon) {
        $$renderer2.push("<!--[-->");
        MobileIcon($$renderer2, {
          size: 22,
          strokeWidth: isActive(item.href) ? 2.5 : 2,
          "aria-hidden": "true"
        });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
      $$renderer2.push(` <span class="text-[9px] font-black uppercase tracking-tighter">${escape_html(item.label.split(" ")[0])}</span></a>`);
    }
    $$renderer2.push(`<!--]--></div></nav>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function InstallPrompt($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function UpdatePrompt($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    head("2agd5u", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Smart E-VISION — DASHBOARD</title>`);
      });
    });
    $$renderer2.push(`<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-gov-blue focus:text-white focus:font-bold focus:rounded-xl focus:shadow-2xl">Skip to Content</a> `);
    if (store_get($$store_subs ??= {}, "$authLoading", authLoading)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="min-h-screen gradient-mesh flex items-center justify-center" role="status" aria-label="Loading Dashboard"><div class="text-center animate-fade-in"><div class="w-16 h-16 mx-auto rounded-2xl gov-header-gradient flex items-center justify-center text-white text-3xl font-bold shadow-elevated mb-4 animate-pulse-glow">V</div> <p class="text-lg text-text-secondary font-medium uppercase tracking-widest text-xs">INITIALIZING CORE...</p></div></div>`);
    } else if (store_get($$store_subs ??= {}, "$user", user)) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="min-h-screen bg-surface">`);
      Sidebar($$renderer2);
      $$renderer2.push(`<!---->  <main id="main-content" class="lg:ml-72 min-h-screen" aria-labelledby="dashboard-title"><div class="p-4 pt-16 lg:pt-8 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">`);
      children($$renderer2);
      $$renderer2.push(`<!----></div></main> `);
      InstallPrompt($$renderer2);
      $$renderer2.push(`<!----> `);
      UpdatePrompt($$renderer2);
      $$renderer2.push(`<!----></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
