import { d as attr_class, j as attr, g as escape_html, f as stringify, e as ensure_array_like, m as attr_style, h as head, c as store_get, u as unsubscribe_stores } from "../../../../chunks/index2.js";
import "pdf-lib";
import { p as public_env } from "../../../../chunks/shared-server.js";
import "../../../../chunks/supabase.js";
import "clsx";
import "../../../../chunks/toast.js";
import { s as settings } from "../../../../chunks/settings2.js";
function FileDropZone($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      accept = ".docx,.pdf",
      disabled = false
    } = $$props;
    $$renderer2.push(`<div${attr_class(`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer min-h-[200px] flex items-center justify-center ${stringify(disabled ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50" : "")} ${stringify("border-gray-300 hover:border-gov-blue/50 hover:bg-glass-blue")}`)} role="button" tabindex="0" aria-label="Drop zone for file upload"><input type="file"${attr("accept", accept)} class="hidden"${attr("disabled", disabled, true)}/> <div class="text-center px-6 py-8">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="animate-fade-in"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-xs font-bold text-text-muted uppercase">File</div> <p class="text-lg font-bold text-text-primary">${escape_html("Drag & drop your file here")}</p> `);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="text-base text-text-muted mt-2 font-medium">or click to browse</p>`);
      }
      $$renderer2.push(`<!--]--> <p class="text-xs text-text-muted mt-3">Accepted formats: .docx, .pdf</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function UploadProgress($$renderer, $$props) {
  let { currentPhase, progress = 0, message = "" } = $$props;
  const steps = [
    { phase: "transcoding", label: "Transcoding", icon: "" },
    { phase: "compressing", label: "Compressing", icon: "" },
    { phase: "hashing", label: "Hashing", icon: "" },
    { phase: "stamping", label: "Stamping", icon: "" },
    { phase: "uploading", label: "Syncing", icon: "" }
  ];
  function getStepStatus(step) {
    const currentIdx = steps.findIndex((s) => s.phase === currentPhase);
    const stepIdx = steps.findIndex((s) => s.phase === step.phase);
    if (stepIdx < currentIdx) return "done";
    if (stepIdx === currentIdx) return "active";
    return "pending";
  }
  $$renderer.push(`<div class="glass-card-static p-6"><div class="flex items-center justify-between mb-6"><!--[-->`);
  const each_array = ensure_array_like(steps);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let step = each_array[i];
    const status = getStepStatus(step);
    $$renderer.push(`<div class="flex flex-col items-center gap-2 flex-1"><div${attr_class(`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${stringify(status === "done" ? "bg-gov-green text-white shadow-md" : "")} ${stringify(status === "active" ? "bg-gov-blue text-white shadow-lg animate-pulse-glow" : "")} ${stringify(status === "pending" ? "bg-gray-100 text-text-muted" : "")} ${stringify(status === "error" ? "bg-gov-red text-white" : "")}`)}>`);
    if (status === "done") {
      $$renderer.push("<!--[-->");
      $$renderer.push(`DONE`);
    } else {
      $$renderer.push("<!--[!-->");
      $$renderer.push(`${escape_html(step.icon)}`);
    }
    $$renderer.push(`<!--]--></div> <span${attr_class(`text-xs font-medium text-center ${stringify(status === "active" ? "text-gov-blue font-semibold" : "text-text-muted")}`)}>${escape_html(step.label)}</span></div> `);
    if (i < steps.length - 1) {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<div${attr_class(`flex-shrink-0 w-8 h-0.5 mt-[-1.5rem] ${stringify(getStepStatus(steps[i]) === "done" ? "bg-gov-green" : "bg-gray-200")}`)}></div>`);
    } else {
      $$renderer.push("<!--[!-->");
    }
    $$renderer.push(`<!--]-->`);
  }
  $$renderer.push(`<!--]--></div> `);
  {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-gov-blue to-gov-blue-light rounded-full transition-all duration-500"${attr_style(`width: ${stringify(progress)}%`)}></div></div>`);
  }
  $$renderer.push(`<!--]--> `);
  if (message) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<p class="text-sm text-text-secondary mt-3 text-center font-medium">${escape_html(message)}</p>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--></div>`);
}
({
  // Fallback order:
  // 1. PUBLIC_APP_URL from .env or Vercel
  // 2. Production Vercel URL
  // 3. window.location.origin (browser onl
  // 4. Default local dev URL
  APP_URL: public_env.PUBLIC_APP_URL || "https://v0-s-evision.vercel.app"
});
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let currentPhase = "transcoding";
    let progress = 0;
    let message = "";
    let processLog = [];
    head("16ciwgt", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Upload Document — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div><div class="mb-8 flex items-start justify-between"><div><h1 class="text-2xl font-bold text-text-primary flex items-center gap-2">Upload Document <span class="text-[10px] opacity-20 font-mono font-normal">UPLOAD_PAGE_V2</span></h1> <p class="text-base text-text-secondary mt-1">Submit your DLL, ISP, or ISR for archival</p> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-2 space-y-6">`);
    FileDropZone($$renderer2, {
      disabled: store_get($$store_subs ??= {}, "$settings", settings).maintenance_mode,
      maxSizeMb: store_get($$store_subs ??= {}, "$settings", settings).max_upload_size_mb
    });
    $$renderer2.push(`<!----> `);
    if (store_get($$store_subs ??= {}, "$settings", settings).maintenance_mode) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="p-4 bg-gov-red/10 border border-gov-red/20 rounded-2xl text-gov-red text-center font-bold animate-pulse" role="alert">🚩 SYSTEM MAINTENANCE ACTIVE: UPLOADS ARE TEMPORARILY
                    DISABLED</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="animate-fade-in">`);
    UploadProgress($$renderer2, { currentPhase, progress, message });
    $$renderer2.push(`<!----> <div class="mt-4 p-4 rounded-xl bg-gray-900 font-mono text-xs text-green-400 h-48 overflow-y-auto"><div class="mb-2 text-gray-500 border-b border-gray-800 pb-1">> Smart E-VISION PIPELINE v2.0 initialized...</div> <!--[-->`);
    const each_array = ensure_array_like(processLog);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let log = each_array[$$index];
      $$renderer2.push(`<div class="mb-1"><span class="text-gray-600">[${escape_html(log.timestamp)}]</span> ${escape_html(log.message)}</div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="animate-pulse">_</div>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="space-y-6"><div class="glass-card-static p-6"><h3 class="text-lg font-bold text-text-primary mb-4">How It Works</h3> <ol class="space-y-3 text-sm text-text-secondary"><li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">1</span> <span><strong>Transcode</strong> — Word files are converted
                            to PDF</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">2</span> <span><strong>Compress</strong> — Files are optimized to &lt;1MB</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">3</span> <span><strong>Hash</strong> — SHA-256 fingerprint for integrity</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">4</span> <span><strong>Stamp</strong> — Verification QR code is embedded</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">5</span> <span><strong>Sync</strong> — Uploaded to secure cloud storage</span></li></ol></div> <div class="glass-card-static p-6 border-l-4 border-gov-gold"><h3 class="text-lg font-bold text-text-primary mb-3">Security &amp; Integrity</h3> <p class="text-sm text-text-secondary mb-3">Your documents are secured with <strong>SHA-256</strong> digital
                    fingerprinting.</p> <ul class="space-y-2 text-xs text-text-muted"><li class="flex gap-2"><span><strong>Anti-Tampering:</strong> Any change to the file
                            content will alter its hash, making it invalid.</span></li> <li class="flex gap-2"><span><strong>No Duplicates:</strong> The system automatically
                            rejects files that have already been archived.</span></li> <li class="flex gap-2"><span><strong>Verifiable:</strong> Each document gets a unique
                            QR code for instant authenticity checks.</span></li></ul></div> <div class="glass-card-static p-6"><h3 class="text-lg font-bold text-text-primary mb-3">System Status</h3> <p class="text-sm text-text-secondary leading-relaxed">No internet? No problem. Your files are queued locally and
                    will auto-sync when your connection is restored.</p></div></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
