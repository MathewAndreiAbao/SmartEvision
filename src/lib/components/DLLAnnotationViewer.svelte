<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { 
        Clock, AlertCircle, CheckCircle, MessageSquare, Highlighter, 
        ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Trash2, 
        FileText, Check, Plus, HelpCircle, Eye
    } from 'lucide-svelte';
    import type { DLLAnnotation } from '$lib/types/dll-review';
    import { fade, fly } from 'svelte/transition';

    export let annotations: DLLAnnotation[] = [];
    export let submissionId: string = '';
    export let isReviewer: boolean = false;
    export let fileUrl: string = '';
    export let onAnnotationCreate: (annotation: any) => void = () => {};
    export let onAnnotationDelete: (id: string) => void = () => {};

    // PDF.js State
    let pdfjsLoaded = false;
    let pdfDoc: any = null;
    let numPages = 0;
    let currentPage = 1;
    let zoom = 1.0;
    let rendering = false;
    let loadingPdf = false;
    let loadError = '';

    // Elements
    let canvasEl: HTMLCanvasElement;
    let containerEl: HTMLDivElement;

    // View dimensions
    let pageWidth = 0;
    let pageHeight = 0;

    // Annotation Tools State
    let selectedTool: 'highlight' | 'comment' | 'flag' | null = null;
    let highlightColor = '#EAB308'; // Default yellow/gold
    let commentText = '';
    
    // Floating Annotation Dialog State
    let activeClick: { x: number; y: number; page: number } | null = null;
    let activeAnnotationId: string | null = null;

    // Tooltip/Hover State
    let hoveredAnnotation: DLLAnnotation | null = null;
    let tooltipX = 0;
    let tooltipY = 0;

    // Is it a PDF?
    $: isPdf = fileUrl && (fileUrl.toLowerCase().includes('.pdf') || fileUrl.includes('/pdf') || fileUrl.toLowerCase().includes('intent=download'));

    onMount(() => {
        if (isPdf) {
            loadPdfJs();
        }
    });

    // Re-load if URL changes
    $: if (fileUrl && pdfjsLoaded) {
        initPdf();
    }

    function loadPdfJs() {
        if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            pdfjsLoaded = true;
            initPdf();
            return;
        }

        loadingPdf = true;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            pdfjsLoaded = true;
            initPdf();
        };
        script.onerror = () => {
            loadingPdf = false;
            loadError = 'Failed to load PDF viewer library. Please refresh.';
        };
        document.head.appendChild(script);
    }

    async function initPdf() {
        if (!fileUrl) return;
        loadingPdf = true;
        loadError = '';
        try {
            const loadingTask = (window as any).pdfjsLib.getDocument({
                url: fileUrl,
                withCredentials: false
            });
            pdfDoc = await loadingTask.promise;
            numPages = pdfDoc.numPages;
            currentPage = 1;
            await renderPage(currentPage);
        } catch (err: any) {
            console.error("PDF init error:", err);
            loadError = 'Could not load PDF document. Reverting to basic comments view.';
        } finally {
            loadingPdf = false;
        }
    }

    async function renderPage(pageNum: number) {
        if (!pdfDoc || !canvasEl) return;
        rendering = true;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: zoom });

            canvasEl.height = viewport.height;
            canvasEl.width = viewport.width;

            pageWidth = viewport.width;
            pageHeight = viewport.height;

            const renderContext = {
                canvasContext: canvasEl.getContext('2d'),
                viewport: viewport
            };
            await page.render(renderContext).promise;
        } catch (err) {
            console.error("Page render error:", err);
        } finally {
            rendering = false;
        }
    }

    // Zoom Handlers
    async function handleZoomIn() {
        if (zoom < 2.5) {
            zoom += 0.25;
            await renderPage(currentPage);
        }
    }

    async function handleZoomOut() {
        if (zoom > 0.5) {
            zoom -= 0.25;
            await renderPage(currentPage);
        }
    }

    // Pagination
    async function handlePrevPage() {
        if (currentPage > 1) {
            currentPage--;
            activeClick = null;
            await renderPage(currentPage);
        }
    }

    async function handleNextPage() {
        if (currentPage < numPages) {
            currentPage++;
            activeClick = null;
            await renderPage(currentPage);
        }
    }

    async function jumpToPage(pageNum: number) {
        if (pageNum >= 1 && pageNum <= numPages) {
            currentPage = pageNum;
            activeClick = null;
            await renderPage(currentPage);
        }
    }

    // Click on page overlay
    function handlePageClick(e: MouseEvent) {
        if (!selectedTool || !isReviewer) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // Calculate percentage coordinates (responsive & works at any zoom level!)
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        activeClick = { x, y, page: currentPage };
        commentText = '';
    }

    function handleAddAnnotation() {
        if (!activeClick || !commentText.trim()) return;

        const annotation = {
            submission_id: submissionId,
            annotation_type: selectedTool,
            content: commentText,
            page_number: activeClick.page,
            position: {
                x: activeClick.x,
                y: activeClick.y,
                width: selectedTool === 'highlight' ? 12 : 4,
                height: selectedTool === 'highlight' ? 3 : 4
            },
            color: highlightColor,
            is_official: isReviewer
        };

        onAnnotationCreate(annotation);
        
        // Reset state
        activeClick = null;
        commentText = '';
        selectedTool = null;
    }

    // Helpers
    function getAnnotationIcon(type: string) {
        switch (type) {
            case 'highlight': return Highlighter;
            case 'comment': return MessageSquare;
            case 'flag': return AlertCircle;
            default: return HelpCircle;
        }
    }

    function getAnnotationColor(type: string): string {
        switch (type) {
            case 'highlight': return 'bg-yellow-50 border-yellow-300 text-yellow-700';
            case 'comment': return 'bg-blue-50 border-blue-300 text-blue-700';
            case 'flag': return 'bg-red-50 border-red-300 text-red-700';
            default: return 'bg-surface-muted border-border-subtle text-text-secondary';        }
    }

    function getIndicatorBg(type: string): string {
        switch (type) {
            case 'highlight': return 'bg-yellow-400 hover:bg-yellow-500 shadow-yellow-500/20';
            case 'comment': return 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20';
            case 'flag': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
            default: return 'bg-surface-muted hover:bg-surface-muted';        }
    }

    function showTooltip(annotation: DLLAnnotation, e: MouseEvent) {
        hoveredAnnotation = annotation;
        const rect = containerEl.getBoundingClientRect();
        tooltipX = e.clientX - rect.left;
        tooltipY = e.clientY - rect.top - 10;
    }

    function hideTooltip() {
        hoveredAnnotation = null;
    }

    // Filter annotations for the current page
    $: pageAnnotations = annotations.filter(a => a.page_number === currentPage);
</script>

<div class="w-full">
    <!-- Header/Toolbar -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-subtle">
        <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-lg font-bold text-text-primary flex items-center gap-2">
                <FileText size={20} class="text-gov-blue" />
                Document Review Workspace
            </h3>
            
            {#if isPdf && pdfDoc}
                <span class="px-2 py-0.5 bg-gov-blue/10 text-gov-blue text-xs font-bold rounded-full">
                    Acrobat Interactive Mode
                </span>
            {/if}
        </div>

        <!-- Toolbar controls -->
        {#if isPdf && pdfDoc && isReviewer}
            <div class="flex flex-wrap items-center gap-2 bg-surface-muted p-1.5 rounded-xl border border-border-subtle">                <button
                    onclick={() => {
                        selectedTool = selectedTool === 'highlight' ? null : 'highlight';
                        highlightColor = '#EAB308';
                    }}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {selectedTool === 'highlight' ? 'bg-yellow-500 text-white shadow-md' : 'text-text-muted hover:bg-surface-white'}"                >
                    <Highlighter size={14} />
                    Highlight
                </button>

                <button
                    onclick={() => {
                        selectedTool = selectedTool === 'comment' ? null : 'comment';
                        highlightColor = '#3B82F6';
                    }}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {selectedTool === 'comment' ? 'bg-blue-500 text-white shadow-md' : 'text-text-muted hover:bg-surface-white'}"                >
                    <MessageSquare size={14} />
                    Comment
                </button>

                <button
                    onclick={() => {
                        selectedTool = selectedTool === 'flag' ? null : 'flag';
                        highlightColor = '#EF4444';
                    }}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {selectedTool === 'flag' ? 'bg-red-500 text-white shadow-md' : 'text-text-muted hover:bg-surface-white'}"                >
                    <AlertCircle size={14} />
                    Flag Issue
                </button>
            </div>
        {/if}
    </div>

    {#if loadingPdf}
        <div class="flex flex-col items-center justify-center py-24">
            <div class="w-10 h-10 border-4 border-gov-blue border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-sm font-semibold text-text-muted">Loading interactive document viewer...</p>
        </div>
    {:else if loadError || !isPdf}
        <!-- Fallback standard comments view -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 space-y-4">
                <div class="bg-surface-muted border border-border-subtle rounded-xl p-8 text-center">                    <FileText size={48} class="mx-auto text-text-muted/40 mb-3" />
                    <p class="text-sm font-bold text-text-primary">Standard Annotation Mode</p>
                    <p class="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                        This document does not support inline layout annotation. You can still add and view sidebar notes.
                    </p>

                    {#if isReviewer}
                        <div class="mt-6 max-w-md mx-auto text-left bg-surface-white border border-border-subtle rounded-xl p-4">
                            <label for="review-note" class="block text-xs font-bold text-text-muted uppercase mb-2">Add Review Note</label>
                            <textarea
                                id="review-note"                                bind:value={commentText}
                                placeholder="Type your observation..."
                                class="w-full p-3 border border-border-subtle rounded-lg text-sm font-medium resize-none focus:ring-2 focus:ring-gov-blue outline-none"
                                rows="3"
                            ></textarea>
                            <div class="flex justify-between items-center mt-3">
                                <select 
                                    bind:value={selectedTool} 
                                    class="text-xs font-semibold bg-surface-muted border border-border-subtle p-1.5 rounded-lg text-text-primary"                                >
                                    <option value="comment">Comment</option>
                                    <option value="highlight">Observation</option>
                                    <option value="flag">Critical Issue</option>
                                </select>
                                <button
                                    onclick={() => {
                                        selectedTool = selectedTool || 'comment';
                                        const annotation = {
                                            submission_id: submissionId,
                                            annotation_type: selectedTool,
                                            content: commentText,
                                            is_official: isReviewer
                                        };
                                        onAnnotationCreate(annotation);
                                        commentText = '';
                                        selectedTool = null;
                                    }}
                                    disabled={!commentText.trim()}
                                    class="px-4 py-2 bg-gov-blue hover:bg-gov-blue-dark text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Sidebar list of comments -->
            <div class="space-y-3">
                <h4 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Audit Notes ({annotations.length})</h4>
                {#if annotations.length === 0}
                    <p class="text-xs text-text-muted italic">No observations added yet.</p>
                {:else}
                    {#each annotations as annotation}
                        <div class="p-4 border rounded-xl bg-surface-white border-border-subtle flex flex-col gap-2">                            <div class="flex items-center justify-between">
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase {getAnnotationColor(annotation.annotation_type)}">
                                    {annotation.annotation_type}
                                </span>
                                {#if isReviewer}
                                    <button 
                                        onclick={() => onAnnotationDelete(annotation.id)}
                                        class="p-1 text-text-muted hover:text-gov-red rounded-lg hover:bg-gov-red/10 transition-colors"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                {/if}
                            </div>
                            <p class="text-sm text-text-primary font-medium">{annotation.content}</p>
                            <span class="text-[10px] text-text-muted uppercase font-semibold">
                                {new Date(annotation.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {:else}
        <!-- Acrobat Interactive PDF Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            <!-- Document View Column -->
            <div class="lg:col-span-3 flex flex-col">
                <!-- PDF Controls Bar -->
                <div class="flex items-center justify-between p-3 bg-surface-muted text-white rounded-t-xl">                    <div class="flex items-center gap-2">
                        <button
                            onclick={handlePrevPage}
                            disabled={currentPage === 1}
                            class="p-1.5 rounded-lg hover:bg-surface-muted disabled:opacity-30 transition-colors"                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span class="text-xs font-semibold select-none">
                            Page {currentPage} of {numPages}
                        </span>
                        <button
                            onclick={handleNextPage}
                            disabled={currentPage === numPages}
                            class="p-1.5 rounded-lg hover:bg-surface-muted disabled:opacity-30 transition-colors"                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <!-- Zoom Controls -->
                    <div class="flex items-center gap-1.5 bg-surface-muted px-2 py-1 rounded-lg">
                        <button 
                            onclick={handleZoomOut} 
                            disabled={zoom <= 0.5}
                            class="p-1 hover:bg-surface-muted rounded disabled:opacity-30 transition-colors"                        >
                            <ZoomOut size={14} />
                        </button>
                        <span class="text-[11px] font-bold min-w-[40px] text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button 
                            onclick={handleZoomIn} 
                            disabled={zoom >= 2.5}
                            class="p-1 hover:bg-surface-muted rounded disabled:opacity-30 transition-colors"                        >
                            <ZoomIn size={14} />
                        </button>
                    </div>
                </div>

                <!-- PDF Viewer & Canvas Canvas Panel -->
                <div 
                    bind:this={containerEl}
                    class="relative flex justify-center bg-surface-muted border-x border-b border-border-subtle overflow-auto p-4 select-none min-h-[500px] max-h-[800px] rounded-b-xl"
                >
                    <div 
                        class="relative shadow-xl border border-border-subtle/60 bg-surface-white"                        style="width: {pageWidth}px; height: {pageHeight}px;"
                    >
                        <canvas bind:this={canvasEl}></canvas>

                        <!-- Absolute Annotation Placement & Indicator Layer -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div 
                            onclick={handlePageClick}
                            class="absolute inset-0 z-10 cursor-crosshair"
                            class:cursor-default={!selectedTool}
                        >
                            <!-- Placed Annotations -->
                            {#each pageAnnotations as annotation (annotation.id)}
                                {@const pos = annotation.position || { x: 0, y: 0, width: 5, height: 5 }}
                                
                                {#if annotation.annotation_type === 'highlight'}
                                    <!-- Highlight Overlay Box -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div 
                                        onmouseenter={(e) => showTooltip(annotation, e)}
                                        onmouseleave={hideTooltip}
                                        class="absolute border-b-2 transition-all cursor-pointer opacity-40 hover:opacity-65"
                                        style="left: {pos.x}%; top: {pos.y}%; width: {pos.width || 12}%; height: {pos.height || 3}%; background-color: {annotation.color}; border-color: {annotation.color};"
                                    ></div>
                                {:else}
                                    <!-- Comment / Flag Pin -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div 
                                        onmouseenter={(e) => showTooltip(annotation, e)}
                                        onmouseleave={hideTooltip}
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            activeAnnotationId = activeAnnotationId === annotation.id ? null : annotation.id;
                                        }}
                                        class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 hover:scale-125 {getIndicatorBg(annotation.annotation_type)}"
                                        style="left: {pos.x}%; top: {pos.y}%;"
                                    >
                                        <svelte:component this={getAnnotationIcon(annotation.annotation_type)} size={12} />
                                    </div>
                                {/if}
                            {/each}

                            <!-- Active Click Dialog Marker -->
                            {#if activeClick && activeClick.page === currentPage}
                                <div 
                                    class="absolute w-5 h-5 bg-gov-blue text-white rounded-full flex items-center justify-center animate-ping pointer-events-none"
                                    style="left: {activeClick.x}%; top: {activeClick.y}%; transform: translate(-50%, -50%);"
                                ></div>
                                <div 
                                    class="absolute w-5 h-5 bg-gov-blue text-white rounded-full flex items-center justify-center shadow-lg pointer-events-none"
                                    style="left: {activeClick.x}%; top: {activeClick.y}%; transform: translate(-50%, -50%);"
                                >
                                    <Plus size={10} />
                                </div>
                            {/if}
                        </div>

                        <!-- Hover Info Dialog Tooltip -->
                        {#if hoveredAnnotation}
                            <div 
                                class="absolute z-30 pointer-events-none bg-surface-muted text-white text-xs rounded-lg p-3 shadow-xl max-w-xs flex flex-col gap-1 -translate-x-1/2"                                style="left: {tooltipX}px; top: {tooltipY - 60}px;"
                                transition:fade={{ duration: 100 }}
                            >
                                <div class="flex items-center gap-1.5">
                                    <span class="font-bold uppercase text-[9px] px-1 bg-surface-white/20 rounded">                                        {hoveredAnnotation.annotation_type}
                                    </span>
                                    <span class="opacity-50 text-[9px]">
                                        Page {hoveredAnnotation.page_number}
                                    </span>
                                </div>
                                <p class="font-medium text-white/95 mt-0.5 leading-relaxed">{hoveredAnnotation.content}</p>
                            </div>
                        {/if}

                        <!-- Floating Input Popup for adding comments at active click -->
                        {#if activeClick && activeClick.page === currentPage}
                            <div 
                                class="absolute z-20 bg-surface-white border border-border-subtle shadow-2xl rounded-xl p-4 w-72 flex flex-col gap-3 -translate-x-1/2"                                style="left: {activeClick.x}%; top: {activeClick.y + 5}%;"
                                transition:fly={{ y: 10, duration: 200 }}
                            >
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-text-primary flex items-center gap-1">
                                        <Plus size={14} class="text-gov-blue" />
                                        Add {selectedTool}
                                    </span>
                                    <span class="text-[10px] text-text-muted">Page {currentPage}</span>
                                </div>

                                <textarea
                                    bind:value={commentText}
                                    placeholder={`Enter your ${selectedTool}...`}
                                    class="w-full p-2.5 border border-border-subtle rounded-lg text-xs font-medium resize-none focus:ring-2 focus:ring-gov-blue outline-none"
                                    rows="3"
                                ></textarea>
                                <div class="flex justify-end gap-1.5">
                                    <button
                                        onclick={() => {
                                            activeClick = null;
                                            commentText = '';
                                        }}
                                        class="px-2.5 py-1.5 border border-border-subtle rounded-lg text-xs font-bold text-text-muted hover:bg-surface-muted transition-colors uppercase"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onclick={handleAddAnnotation}
                                        disabled={!commentText.trim()}
                                        class="px-3 py-1.5 bg-gov-blue text-white rounded-lg text-xs font-bold hover:bg-gov-blue-dark transition-colors disabled:opacity-50 uppercase"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Annotation Sidebar linking directly to document location -->
            <div class="lg:col-span-1 flex flex-col bg-surface-white border border-border-subtle rounded-xl p-4">                <h4 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center justify-between">
                    Observations
                    <span class="px-2 py-0.5 bg-surface-muted text-text-muted rounded-full text-xs font-bold">
                        {annotations.length}
                    </span>
                </h4>

                <div class="space-y-3 overflow-y-auto max-h-[680px] pr-1">
                    {#if annotations.length === 0}
                        <div class="text-center py-12 border border-dashed border-border-subtle rounded-xl">
                            <MessageSquare size={28} class="mx-auto text-text-muted/40 mb-2" />
                            <p class="text-xs font-bold text-text-muted">No annotations yet</p>
                            <p class="text-[10px] text-text-muted/70 mt-1 px-4">Use tools on the left to click on the document and add feedback.</p>
                        </div>
                    {:else}
                        {#each annotations as annotation}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div                                onclick={() => {
                                    if (annotation.page_number) {
                                        jumpToPage(annotation.page_number);
                                    }
                                }}
                                onkeydown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (annotation.page_number) {
                                            jumpToPage(annotation.page_number);
                                        }
                                    }
                                }}
                                role="button"
                                tabindex="0"
                                class="w-full text-left p-3.5 border rounded-xl bg-surface-white hover:border-gov-blue/50 hover:shadow-sm transition-all duration-200 flex flex-col gap-2 relative group cursor-pointer"                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-1.5">
                                        <span class="px-2 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wider {getAnnotationColor(annotation.annotation_type)}">
                                            {annotation.annotation_type}
                                        </span>
                                        {#if annotation.page_number}
                                            <span class="text-[10px] text-text-muted font-bold">
                                                Page {annotation.page_number}
                                            </span>
                                        {/if}
                                    </div>
                                    
                                    {#if isReviewer}
                                        <button 
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                onAnnotationDelete(annotation.id);
                                            }}
                                            class="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-gov-red hover:bg-gov-red/10 rounded transition-all duration-200"
                                            title="Delete Observation"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    {/if}
                                </div>

                                <p class="text-xs text-text-primary font-semibold leading-relaxed line-clamp-3">
                                    {annotation.content}
                                </p>

                                <span class="text-[9px] text-text-muted/70 uppercase font-bold self-end mt-1">
                                    {new Date(annotation.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>                        {/each}
                    {/if}
                </div>
            </div>

        </div>
    {/if}
</div>

<style>
    /* Custom scrollbar for preview canvas container */
    div::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    div::-webkit-scrollbar-track {
        background: #f1f5f9;
    }
    div::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
    }
    div::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
</style>
