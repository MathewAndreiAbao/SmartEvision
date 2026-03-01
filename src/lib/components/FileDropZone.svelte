<script lang="ts">
    interface Props {
        accept?: string;
        onfileselected: (file: File) => void;
        disabled?: boolean;
        maxSizeMb?: number;
    }

    let {
        accept = ".docx,.pdf",
        onfileselected,
        disabled = false,
        maxSizeMb = 2,
    }: Props = $props();

    let dragOver = $state(false);
    let selectedFile = $state<File | null>(null);
    let errorMessage = $state("");
    let inputEl: HTMLInputElement;

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragOver = false;
        if (disabled) return;
        errorMessage = "";
        const file = e.dataTransfer?.files[0];
        if (file) selectFile(file);
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (!disabled) dragOver = true;
    }

    function handleDragLeave() {
        dragOver = false;
    }

    function handleInputChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        errorMessage = "";
        if (file) selectFile(file);
    }

    function selectFile(file: File) {
        if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
            errorMessage = `File too large. Maximum size is ${maxSizeMb}MB.`;
            selectedFile = null;
            return;
        }
        selectedFile = file;
        onfileselected(file);
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
</script>

<div
    class="relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer min-h-[200px] flex items-center justify-center
		{disabled ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50' : ''}
		{dragOver
        ? 'border-gov-blue bg-gov-blue/5 scale-[1.02] shadow-lg'
        : 'border-gray-300 hover:border-gov-blue/50 hover:bg-glass-blue'}"
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    onclick={() => !disabled && inputEl.click()}
    onkeydown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputEl.click();
        }
    }}
    role="button"
    tabindex="0"
    aria-label="Drop zone for file upload"
>
    <input
        bind:this={inputEl}
        type="file"
        {accept}
        class="hidden"
        onchange={handleInputChange}
        {disabled}
    />

    <div class="text-center px-6 py-8">
        {#if selectedFile}
            <div class="animate-fade-in">
                <div
                    class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gov-blue to-gov-blue-dark flex items-center justify-center text-xs font-bold text-white shadow-md uppercase"
                >
                    {selectedFile.name.split(".").pop()}
                </div>
                <p class="text-lg font-bold text-text-primary">
                    {selectedFile.name}
                </p>
                <p class="text-base text-text-muted mt-1">
                    {formatSize(selectedFile.size)}
                </p>
                <button
                    class="mt-3 text-sm text-gov-blue hover:text-gov-blue-dark font-medium underline underline-offset-2"
                    onclick={(e) => {
                        e.stopPropagation();
                        selectedFile = null;
                        inputEl.value = "";
                    }}
                >
                    Choose a different file
                </button>
            </div>
        {:else}
            <div class="animate-fade-in">
                <div
                    class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-xs font-bold text-text-muted uppercase"
                >
                    File
                </div>
                <p class="text-lg font-bold text-text-primary">
                    {dragOver
                        ? "Drop your file here!"
                        : "Drag & drop your file here"}
                </p>
                {#if errorMessage}
                    <p
                        class="text-sm font-bold text-gov-red mt-2 animate-bounce"
                    >
                        {errorMessage}
                    </p>
                {:else}
                    <p class="text-base text-text-muted mt-2 font-medium">
                        or click to browse
                    </p>
                {/if}
                <p class="text-xs text-text-muted mt-3">
                    Accepted formats: .docx, .pdf
                </p>
            </div>
        {/if}
    </div>
</div>
