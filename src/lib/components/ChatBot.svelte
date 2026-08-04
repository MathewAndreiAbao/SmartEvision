<script lang="ts">
    import { MessageCircle, X, Send, Bot, ChevronDown } from "lucide-svelte";
    import { processQuery, loadDllDocumentsFromSupabase } from "$lib/utils/chatbot";
    import type { ChatResponse, Intent, ChatContext } from "$lib/utils/chatbot";
    import { supabase } from "$lib/utils/supabase";
    import { user, profile } from "$lib/utils/auth";
    import { onMount } from "svelte";

    let isOpen = $state(false);
    let messages: { role: 'user' | 'bot'; text: string; intent?: Intent }[] = $state([]);
    let inputText = $state('');
    let inputEl: HTMLInputElement | undefined = $state();
    let isLoading = $state(false);

    let currentUser = $state<{ id: string } | null>(null);
    let currentProfile = $state<{ id: string; full_name: string; role: string; school_id: string | null; district_id: string | null } | null>(null);
    let lastIntent = $state<Intent | undefined>(undefined);
    let lastSlots = $state<Record<string, string>>({});

    const suggestions = [
        "What is my compliance rate?",
        "When is the next deadline?",
        "How do I upload a DLL?",
        "Find DLLs about fractions",
        "Compare schools in the district",
        "What can you help me with?"
    ];

    onMount(() => {
        messages.push({
            role: 'bot',
            text: "Hello! I am SmartE Vision's AI assistant. I can help check your compliance rate, find DLLs, look up deadlines, and compare school performance using live data. Feel free to ask me anything.",
            intent: 'general_help'
        });
        const unsubUser = user.subscribe((u) => currentUser = u as { id: string } | null);
        const unsubProfile = profile.subscribe((p) => currentProfile = p as any);
        loadDllDocumentsFromSupabase(supabase).catch(() => {});
        return () => { unsubUser(); unsubProfile(); };
    });

    async function handleSend() {
        const q = inputText.trim();
        if (!q) return;

        messages.push({ role: 'user', text: q });
        inputText = '';
        isLoading = true;

        const ctx: ChatContext = {
            supabase,
            userId: currentUser?.id,
            profile: currentProfile,
            memory: { lastIntent, lastSlots }
        };

        const response: ChatResponse = await processQuery(q, ctx);
        isLoading = false;
        messages.push({ role: 'bot', text: response.answer, intent: response.intent });
        lastIntent = response.intent;
        lastSlots = response.slots;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
            e.preventDefault();
            handleSend();
        }
    }

    function applySuggestion(s: string) {
        inputText = s;
        // Auto-focus input and send
        inputEl?.focus();
        setTimeout(() => handleSend(), 100);
    }
</script>

<!-- Floating button -->
{#if !isOpen}
    <button
        onclick={() => (isOpen = true)}
        class="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gov-blue hover:bg-gov-blue-dark text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open chat assistant"
    >
        <Bot size={24} />
    </button>
{:else}
    <!-- Chat window -->
    <div class="fixed bottom-6 right-6 z-50 w-96 h-[32rem] bg-surface-white rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden transition-all duration-200">
        <!-- Header -->
        <div class="bg-gov-blue text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-surface-white/20 rounded-full flex items-center justify-center">
                    <Bot size={16} />
                </div>
                <div>
                    <p class="text-sm font-bold">SmartE Vision Assistant</p>
                    <p class="text-[10px] text-white/70">Ask me anything about the system</p>
                </div>
            </div>
            <button
                onclick={() => (isOpen = false)}
                class="hover:bg-surface-white/20 rounded-lg p-1.5 transition-colors"
                aria-label="Close chat"
            >
                <ChevronDown size={18} />
            </button>
        </div>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted">
            {#each messages as msg, i}
                <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                    {#if msg.role === 'bot'}
                        <div class="flex items-start gap-2 max-w-[85%]">
                            <div class="w-7 h-7 bg-gov-blue/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <Bot size={14} class="text-gov-blue" />
                            </div>
                            <div class="bg-surface-white border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs text-text-primary leading-relaxed shadow-sm">
                                {msg.text}
                            </div>
                        </div>
                    {:else}
                        <div class="bg-gov-blue text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs leading-relaxed max-w-[80%] shadow-sm">
                            {msg.text}
                        </div>
                    {/if}
                </div>
            {/each}

            {#if isLoading}
                <div class="flex justify-start">
                    <div class="flex items-start gap-2 max-w-[85%]">
                        <div class="w-7 h-7 bg-gov-blue/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <Bot size={14} class="text-gov-blue" />
                        </div>
                        <div class="bg-surface-white border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                            <div class="flex gap-1">
                                <span class="w-1.5 h-1.5 bg-gov-blue/60 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                                <span class="w-1.5 h-1.5 bg-gov-blue/60 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                                <span class="w-1.5 h-1.5 bg-gov-blue/60 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Suggestions on first message -->
            {#if messages.length === 1}
                <div class="mt-3">
                    <p class="text-[10px] text-text-muted font-medium mb-2">Try asking:</p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each suggestions as s}
                            <button
                                onclick={() => applySuggestion(s)}
                                class="text-[10px] bg-surface-white border border-border-subtle rounded-full px-3 py-1.5 text-text-muted hover:bg-gov-blue/5 hover:border-gov-blue/30 hover:text-gov-blue transition-colors"
                            >
                                {s}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Input -->
        <div class="px-4 py-3 border-t border-border-subtle bg-surface-white shrink-0">
            <div class="flex items-center gap-2 bg-surface-muted rounded-xl border border-border-subtle px-3 py-2 focus-within:border-gov-blue/50 focus-within:bg-surface-white transition-colors">
                <input
                    bind:this={inputEl}
                    type="text"
                    bind:value={inputText}
                    onkeydown={handleKeydown}
                    placeholder="Ask a question..."
                    class="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/60"
                />
                <button
                    onclick={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    class="p-1.5 rounded-lg text-gov-blue hover:bg-gov-blue/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    </div>
{/if}