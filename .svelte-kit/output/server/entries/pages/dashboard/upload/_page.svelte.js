import { d as attr_class, j as attr, g as escape_html, f as stringify, e as ensure_array_like, n as attr_style, h as head, c as store_get, o as clsx, u as unsubscribe_stores, k as derived } from "../../../../chunks/index2.js";
import "../../../../chunks/config.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toast.js";
import { s as settings } from "../../../../chunks/settings2.js";
function FileDropZone($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      accept = ".docx,.pdf",
      disabled = false
    } = $$props;
    $$renderer2.push(`<div${attr_class(`relative rounded-md border-2 border-dashed transition-all duration-300 cursor-pointer min-h-[200px] flex items-center justify-center ${stringify(disabled ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50" : "")} ${stringify("border-gray-300 hover:border-gov-blue/50 hover:bg-glass-blue")}`)} role="button" tabindex="0" aria-label="Drop zone for file upload"><input type="file"${attr("accept", accept)} class="hidden"${attr("disabled", disabled, true)}/> <div class="text-center px-6 py-8">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="animate-fade-in"><div class="w-16 h-16 mx-auto mb-4 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-text-muted uppercase">File</div> <p class="text-lg font-bold text-text-primary">${escape_html("Drag & drop your file here")}</p> `);
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
    { phase: "analyzing", label: "Analyzing", icon: "" },
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
  $$renderer.push(`<div class="gov-card-static p-6"><div class="grid grid-cols-3 sm:flex sm:items-center sm:justify-between gap-y-6 gap-x-2 mb-6 relative"><!--[-->`);
  const each_array = ensure_array_like(steps);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let step = each_array[i];
    const status = getStepStatus(step);
    $$renderer.push(`<div class="flex flex-col items-center gap-2 relative z-10"><div${attr_class(`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300 ${stringify(status === "done" ? "bg-gov-green text-white shadow-md" : "")} ${stringify(status === "active" ? "bg-gov-blue text-white shadow-lg animate-pulse-glow" : "")} ${stringify(status === "pending" ? "bg-gray-100 text-text-muted" : "")} ${stringify(status === "error" ? "bg-gov-red text-white" : "")}`)}>`);
    if (status === "done") {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`);
    } else {
      $$renderer.push("<!--[!-->");
      $$renderer.push(`${escape_html(i + 1)}`);
    }
    $$renderer.push(`<!--]--></div> <span${attr_class(`text-[10px] sm:text-xs font-medium text-center leading-tight ${stringify(status === "active" ? "text-gov-blue font-semibold" : "text-text-muted")}`)}>${escape_html(step.label)}</span></div> `);
    if (i < steps.length - 1) {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<div${attr_class(`hidden sm:block absolute top-[1.5rem] h-0.5 z-0 ${stringify(getStepStatus(steps[i]) === "done" ? "bg-gov-green" : "bg-gray-200")}`)}${attr_style(`left: calc(${stringify(i / (steps.length - 1) * 100)}% + 2rem); width: calc(${stringify(100 / (steps.length - 1))}% - 4rem);`)}></div>`);
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
function CopilotPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="gov-card-static overflow-hidden transition-all duration-500"><button class="w-full p-5 flex items-center justify-between group cursor-pointer"><div class="flex items-center gap-3"><div class="relative"><div class="p-2 rounded-xl bg-gradient-to-br from-gov-blue/10 to-indigo-500/10 text-gov-blue group-hover:scale-105 transition-transform"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0l.016.016"></path></svg></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gov-blue rounded-full animate-ping"></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="text-left"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Smart Copilot</h3> <p class="text-[9px] text-text-muted font-medium">AI-powered upload assistant</p></div></div> <div class="flex items-center gap-2">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <svg${attr_class(`w-4 h-4 text-text-muted transition-transform duration-300 ${stringify("")}`)} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></div></button> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="px-5 pb-5 space-y-3">`);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="flex items-center gap-3 p-4 rounded-md bg-gov-blue/3 border border-gov-blue/10"><div class="flex gap-1"><div class="w-2 h-2 bg-gov-blue/40 rounded-full animate-bounce" style="animation-delay: 0ms"></div> <div class="w-2 h-2 bg-gov-blue/40 rounded-full animate-bounce" style="animation-delay: 150ms"></div> <div class="w-2 h-2 bg-gov-blue/40 rounded-full animate-bounce" style="animation-delay: 300ms"></div></div> <span class="text-xs font-bold text-gov-blue/60">Analyzing context...</span></div>`);
      }
      $$renderer2.push(`<!--]--> <div class="flex items-center justify-center gap-1.5 pt-2"><div class="w-1.5 h-1.5 rounded-full bg-gov-green animate-pulse"></div> <span class="text-[8px] font-bold text-text-muted uppercase tracking-wide">Offline-Ready · Rule Engine v1.0</span></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let currentPhase = "transcoding";
    let progress = 0;
    let message = "";
    let processLog = [];
    let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    let pendingItems = [];
    let submissionHistory = [];
    let mergedSubmissions = derived(() => [
      ...submissionHistory,
      ...pendingItems.map((p) => ({
        teaching_load_id: p.teachingLoadId,
        week_number: p.weekNumber,
        doc_type: p.docType,
        compliance_status: "Pending Sync",
        created_at: p.timestamp
      }))
    ]);
    head("16ciwgt", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Upload Document — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div><div class="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><h1 class="text-2xl font-bold text-text-primary flex items-center gap-2">Upload Document <span${attr_class(`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-normal border ${stringify(isOnline ? "bg-gov-green/5 text-gov-green border-gov-green/10" : "bg-gov-gold/10 text-gov-gold-dark border-gov-gold/20")}`)}>${escape_html(isOnline ? "Online" : "Offline")}</span></h1> <p class="text-base text-text-secondary mt-1">${escape_html(isOnline ? "Submit your DLL, ISP, or ISR for archival" : "Files will be saved locally and synced when online")}</p> `);
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
      $$renderer2.push(`<div class="p-4 bg-gov-red/10 border border-gov-red/20 rounded-md text-gov-red text-center font-bold animate-pulse" role="alert"><svg class="inline-block w-4 h-4 mr-1 align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> SYSTEM MAINTENANCE ACTIVE: UPLOADS ARE TEMPORARILY DISABLED</div>`);
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
    const each_array_2 = ensure_array_like(processLog);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let log = each_array_2[$$index_2];
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
    $$renderer2.push(`<!--]--></div> <div class="space-y-6">`);
    CopilotPanel($$renderer2, {
      submissions: mergedSubmissions()
    });
    $$renderer2.push(`<!----> <div class="gov-card-static p-6"><h3 class="text-lg font-bold text-text-primary mb-4">How It Works</h3> <ol class="space-y-3 text-sm text-text-secondary"><li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">1</span> <span><strong>Transcode</strong> — Word files are converted
                            to PDF</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">2</span> <span><strong>Compress</strong> — Files are optimized to &lt;1MB</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">3</span> <span><strong>Hash</strong> — SHA-256 fingerprint for integrity</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">4</span> <span><strong>Stamp</strong> — Verification QR code is embedded</span></li> <li class="flex items-start gap-3"><span class="w-7 h-7 rounded-full bg-gov-blue/10 text-gov-blue text-xs font-bold flex items-center justify-center flex-shrink-0">5</span> <span><strong>Sync</strong> — Uploaded to secure cloud storage</span></li></ol></div> <div class="gov-card-static p-6 border-l-4 border-gov-gold"><h3 class="text-lg font-bold text-text-primary mb-3">Security &amp; Integrity</h3> <p class="text-sm text-text-secondary mb-3">Your documents are secured with <strong>SHA-256</strong> digital
                    fingerprinting.</p> <ul class="space-y-2 text-xs text-text-muted"><li class="flex gap-2"><span><strong>Anti-Tampering:</strong> Any change to the file
                            content will alter its hash, making it invalid.</span></li> <li class="flex gap-2"><span><strong>No Duplicates:</strong> The system automatically
                            rejects files that have already been archived.</span></li> <li class="flex gap-2"><span><strong>Verifiable:</strong> Each document gets a unique
                            QR code for instant authenticity checks.</span></li></ul></div> <div class="gov-card-static p-6"><h3 class="text-lg font-bold text-text-primary mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">System Hub <span class="text-[9px] px-1.5 py-0.5 rounded bg-gray-900 text-white font-mono uppercase">Live</span></h3> <div class="space-y-4"><div class="flex items-center justify-between text-[11px] pb-2 border-b border-gray-50"><span class="text-text-muted uppercase font-bold tracking-tight">Signal</span> <span${attr_class(clsx(isOnline ? "text-gov-green font-bold" : "text-gov-gold font-bold"))}>${escape_html(isOnline ? "GLOBAL_SYNC_ACTIVE" : "LOCAL_ONLY_MODE")}</span></div> <div class="flex items-center justify-between text-[11px] pb-2 border-b border-gray-50"><span class="text-text-muted uppercase font-bold tracking-tight">Integrity Ledger</span> <span class="text-text-primary font-mono">${escape_html("INITIALIZING...")}</span></div> <div class="flex items-center justify-between text-[11px] pb-2 border-b border-gray-50"><span class="text-text-muted uppercase font-bold tracking-tight">Storage Cluster</span> <span class="text-text-primary font-mono">IDB_PERSISTENT_V2</span></div> <div class="bg-gray-50 rounded-lg p-3"><h4 class="text-[10px] font-bold text-text-primary uppercase mb-1">PWA Continuity</h4> <p class="text-[10px] text-text-secondary leading-tight">Your sessions are persistent using
                            **navigator.storage**. This archival vault will not
                            reset on refresh.</p></div></div></div></div></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
