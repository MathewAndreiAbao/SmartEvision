<script lang="ts">
    interface Props {
        label?: string;
        compact?: boolean;
    }
    let { label = "Loading data...", compact = false }: Props = $props();
</script>

<div class="cedims-loader" role="status" aria-label={label} class:compact>
    <!-- Animated CEDIMS Logo Icon -->
    <div class="logo-container" aria-hidden="true">
        <svg viewBox="0 0 120 120" class="logo-icon">
            <!-- Shield background -->
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.2" />
                    <stop offset="50%" style="stop-color:#60a5fa;stop-opacity:0.5" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.2" />
                </linearGradient>
            </defs>

            <!-- Pulsing outer ring -->
            <circle cx="60" cy="60" r="58" class="pulse-ring" stroke="url(#pulseGradient)" stroke-width="2" fill="none" />

            <!-- Main shield -->
            <path d="M 60 15 L 90 35 L 90 65 Q 60 95 60 95 Q 30 65 30 35 Z" fill="url(#logoGradient)" class="shield" />

            <!-- Check mark inside shield -->
            <g class="check-mark" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
                <path d="M 48 60 L 56 68 L 72 52" />
            </g>

            <!-- Rotating accent line -->
            <g class="accent-line">
                <line x1="60" y1="10" x2="60" y2="25" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" opacity="0.6" />
            </g>
        </svg>
    </div>

    <!-- Text Label -->
    <div class="text-container">
        <h1 class="cedims-text">CEDIMS</h1>
        <p class="subtitle">Compliance Education Daily Instructional Monitoring System</p>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar">
        <div class="progress-fill"></div>
    </div>

    {#if label}
        <p class="label">{label}</p>
    {/if}
</div>

<style>
    .cedims-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        padding: 3rem 2rem;
        user-select: none;
    }
    .cedims-loader.compact {
        gap: 1rem;
        padding: 1.5rem;
    }

    .logo-container {
        position: relative;
        width: 140px;
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .cedims-loader.compact .logo-container {
        width: 100px;
        height: 100px;
    }

    .logo-icon {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.2));
    }

    .pulse-ring {
        animation: pulse-ring 2s ease-in-out infinite;
    }
    @keyframes pulse-ring {
        0%, 100% {
            r: 58;
            opacity: 0.3;
        }
        50% {
            r: 66;
            opacity: 0;
        }
    }

    .shield {
        animation: shield-float 3s ease-in-out infinite;
    }
    @keyframes shield-float {
        0%, 100% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-8px);
        }
    }

    .check-mark {
        animation: check-draw 1s ease-in-out 0.4s forwards, check-pulse 2s ease-in-out 1.4s infinite;
        opacity: 0;
    }
    @keyframes check-draw {
        from {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            opacity: 0;
        }
        to {
            stroke-dasharray: 50;
            stroke-dashoffset: 0;
            opacity: 1;
        }
    }
    @keyframes check-pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.6;
        }
    }

    .accent-line {
        animation: rotate-accent 2s linear infinite;
        transform-origin: 60px 60px;
    }
    @keyframes rotate-accent {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .text-container {
        text-align: center;
    }

    .cedims-text {
        font-size: 1.875rem;
        font-weight: 900;
        letter-spacing: 0.15em;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
    }
    .cedims-loader.compact .cedims-text {
        font-size: 1.5rem;
    }

    .subtitle {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #718096;
        margin-top: 0.25rem;
        margin: 0;
        max-width: 200px;
    }
    .cedims-loader.compact .subtitle {
        display: none;
    }

    .progress-bar {
        width: 160px;
        height: 6px;
        background: linear-gradient(90deg, #e2e8f0 0%, #cbd5e0 100%);
        border-radius: 999px;
        overflow: hidden;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .cedims-loader.compact .progress-bar {
        width: 120px;
        height: 4px;
    }

    .progress-fill {
        height: 100%;
        width: 30%;
        border-radius: 999px;
        background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
        background-size: 200% 100%;
        animation: progress-slide 2s ease-in-out infinite;
        box-shadow: 0 0 10px rgba(37, 99, 235, 0.5);
    }
    @keyframes progress-slide {
        0% {
            width: 10%;
            filter: blur(0px);
        }
        50% {
            width: 60%;
            filter: blur(0.5px);
        }
        100% {
            width: 100%;
            filter: blur(0px);
        }
    }

    .label {
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #4a5568;
        text-align: center;
        max-width: 240px;
        line-height: 1.4;
    }
    .cedims-loader.compact .label {
        font-size: 0.7rem;
    }
</style>