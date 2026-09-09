<script>
	import { onMount } from 'svelte';

	export let appName = 'CEDIMS';
	export let subtitle = 'Intelligent Document Management System';
	export let duration = 3000;

	let isLoading = true;
	let progress = 0;

	onMount(() => {
		// Simulate progress
		const progressInterval = setInterval(() => {
			progress = Math.min(progress + Math.random() * 30, 90);
		}, 200);

		// Complete loading after duration
		const loadingTimeout = setTimeout(() => {
			progress = 100;
			setTimeout(() => {
				isLoading = false;
				window.dispatchEvent(new CustomEvent('loading-complete'));
			}, 500);
		}, duration - 500);

		return () => {
			clearInterval(progressInterval);
			clearTimeout(loadingTimeout);
		};
	});
</script>

{#if isLoading}
	<div class="loading-container">
		<!-- Minimalist CEDIMS Loading -->
		<div class="loading-content">
			<!-- Minimalist Document Icon with Animation -->
			<div class="cedims-icon">
				<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
					<!-- Document background -->
					<rect x="20" y="15" width="60" height="70" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/>
					<!-- Document lines (animated) -->
					<line x1="30" y1="30" x2="70" y2="30" stroke="currentColor" stroke-width="2" opacity="0.8" class="doc-line-1"/>
					<line x1="30" y1="42" x2="70" y2="42" stroke="currentColor" stroke-width="2" opacity="0.7" class="doc-line-2"/>
					<line x1="30" y1="54" x2="70" y2="54" stroke="currentColor" stroke-width="2" opacity="0.6" class="doc-line-3"/>
					<line x1="30" y1="66" x2="55" y2="66" stroke="currentColor" stroke-width="2" opacity="0.5" class="doc-line-4"/>
				</svg>
			</div>

			<!-- App Name -->
			<h1 class="loading-title">{appName}</h1>

			<!-- Subtitle -->
			<p class="loading-subtitle">{subtitle}</p>

			<!-- Progress Bar -->
			<div class="progress-container">
				<div class="progress-bar" style="width: {progress}%"></div>
			</div>

			<!-- Status -->
			<p class="loading-status">Preparing your documents<span class="dots">.</span></p>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, sans-serif;
	}

	.loading-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f5f6f8 0%, #ebedf0 100%);
		overflow: hidden;
		z-index: 9999;
	}

	/* Content Container */
	.loading-content {
		text-align: center;
		color: #111827;
		animation: fadeIn 0.6s ease-out;
	}

	/* Minimalist Document Icon */
	.cedims-icon {
		width: 100px;
		height: 100px;
		margin: 0 auto 40px;
		animation: documentFloat 3s ease-in-out infinite;
	}

	.cedims-icon svg {
		width: 100%;
		height: 100%;
		color: #2563eb;
		filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.15));
	}

	.doc-line-1 {
		animation: lineReveal 1.2s ease-out forwards;
		animation-delay: 0s;
		transform-origin: 30px 30px;
	}

	.doc-line-2 {
		animation: lineReveal 1.2s ease-out forwards;
		animation-delay: 0.15s;
		transform-origin: 30px 42px;
	}

	.doc-line-3 {
		animation: lineReveal 1.2s ease-out forwards;
		animation-delay: 0.3s;
		transform-origin: 30px 54px;
	}

	.doc-line-4 {
		animation: lineReveal 1.2s ease-out forwards;
		animation-delay: 0.45s;
		transform-origin: 30px 66px;
	}

	/* App Name */
	.loading-title {
		font-size: 42px;
		font-weight: 700;
		margin: 0 0 8px 0;
		letter-spacing: -0.5px;
		color: #111827;
		animation: fadeInDown 0.8s ease-out;
	}

	/* Subtitle */
	.loading-subtitle {
		font-size: 14px;
		color: #6b7590;
		margin: 0 0 50px 0;
		font-weight: 400;
		letter-spacing: 0.3px;
		animation: fadeInDown 0.8s ease-out 0.1s backwards;
	}

	/* Progress Bar */
	.progress-container {
		width: 200px;
		height: 2px;
		background: #e2e8f0;
		border-radius: 1px;
		overflow: hidden;
		margin-bottom: 20px;
		animation: fadeInDown 0.8s ease-out 0.2s backwards;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #2563eb, #3b82f6);
		border-radius: 1px;
		transition: width 0.3s ease;
		box-shadow: 0 0 8px rgba(37, 99, 235, 0.4);
	}

	/* Status Text */
	.loading-status {
		font-size: 13px;
		color: #6b7590;
		margin: 0;
		font-weight: 500;
		letter-spacing: 0.2px;
		animation: fadeInDown 0.8s ease-out 0.3s backwards;
	}

	.dots {
		display: inline-block;
		width: 1.2em;
		text-align: left;
		animation: dots 1.4s steps(4, end) infinite;
	}

	/* Animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeInDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes documentFloat {
		0%, 100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-12px);
		}
	}

	@keyframes lineReveal {
		from {
			opacity: 0;
			stroke-dasharray: 40;
			stroke-dashoffset: 40;
		}
		to {
			opacity: 1;
			stroke-dasharray: 40;
			stroke-dashoffset: 0;
		}
	}

	@keyframes dots {
		0%, 20% {
			content: '';
		}
		40% {
			content: '.';
		}
		60% {
			content: '..';
		}
		80%, 100% {
			content: '...';
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.loading-title {
			font-size: 32px;
		}

		.loading-subtitle {
			font-size: 13px;
		}

		.cedims-icon {
			width: 80px;
			height: 80px;
		}

		.progress-container {
			width: 160px;
		}
	}

	@media (max-width: 480px) {
		.loading-title {
			font-size: 24px;
		}

		.loading-subtitle {
			font-size: 12px;
		}

		.cedims-icon {
			width: 60px;
			height: 60px;
			margin-bottom: 30px;
		}

		.progress-container {
			width: 140px;
		}

		.loading-status {
			font-size: 12px;
		}
	}
</style>
