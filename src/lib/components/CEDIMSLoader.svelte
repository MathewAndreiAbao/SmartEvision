<script lang="ts">
    interface Props {
        label?: string;
        compact?: boolean;
    }
    let { label = "Loading data...", compact = false }: Props = $props();

    const letters = "CEDIMS".split("");
    // Cycle through the CEDIMS brand palette so each letter shifts color over time.
    const palette = ["#0038A8", "#FCD116", "#CE1126", "#008751", "#00509E", "#FFD100"];
</script>

<div class="cedims-loader" role="status" aria-label={label} class:compact>
    <div class="word" aria-hidden="true">
        {#each letters as ch, i}
            <span
                class="char"
                style="--i: {i};"
            >{ch}</span>
        {/each}
    </div>
    <div class="bar">
        <div class="fill"></div>
    </div>
    <p class="label">{label}</p>
</div>

<style>
    .cedims-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;
        padding: 2rem 1rem;
        user-select: none;
    }
    .cedims-loader.compact {
        gap: 0.6rem;
        padding: 1rem;
    }

    .word {
        display: flex;
        gap: 0.25rem;
        font-weight: 800;
        letter-spacing: 0.18em;
        line-height: 1;
    }
    .word:not(.compact) .char {
        font-size: 2.25rem;
    }
    .char {
        font-family: inherit;
        animation: cedims-hue 2.4s ease-in-out infinite;
        animation-delay: calc(var(--i) * 0.22s);
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    }

    @keyframes cedims-hue {
        0%, 100% {
            color: #0038A8;
            transform: translateY(0);
        }
        20% {
            color: #FCD116;
        }
        40% {
            color: #CE1126;
            transform: translateY(-6px);
        }
        60% {
            color: #008751;
        }
        80% {
            color: #00509E;
        }
    }

    .bar {
        width: 11rem;
        height: 4px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(0, 56, 168, 0.12);
    }
    .fill {
        height: 100%;
        width: 40%;
        border-radius: 999px;
        background: linear-gradient(90deg, #0038A8, #FCD116, #CE1126, #008751);
        background-size: 200% 100%;
        animation: cedims-slide 1.4s ease-in-out infinite;
    }
    @keyframes cedims-slide {
        0% { transform: translateX(-110%); }
        100% { transform: translateX(320%); }
    }

    .label {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #64748b;
    }
</style>
