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
		<!-- Animated Gradient Blobs -->
		<div class="gradient-blobs">
			<div class="blob-1"></div>
			<div class="blob-2"></div>
			<div class="blob-3"></div>
			<div class="blob-4"></div>
		</div>

		<!-- Loading Content -->
		<div class="loading-content">
			<div class="loading-logo">
				<span class="loading-logo-icon"></span>
				<span>{appName}</span>
			</div>

			<div class="loading-subtitle">
				{subtitle}
			</div>

			<div class="progress-container">
				<div class="progress-bar" style="width: {progress}%"></div>
			</div>

			<div class="loading-dots">
				<div class="dot"></div>
				<div class="dot"></div>
				<div class="dot"></div>
			</div>

			<div class="loading-text">Loading</div>
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
		background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%);
		overflow: hidden;
		z-index: 9999;
	}

	/* Gradient Blob Background */
	.gradient-blobs {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		z-index: 1;
		pointer-events: none;
	}

	/* Blob 1 - Top Left (Blue to Cyan) */
	.blob-1 {
		position: absolute;
		top: -20%;
		left: -15%;
		width: 600px;
		height: 600px;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(30, 136, 229, 0.8),
			rgba(13, 71, 161, 0.4),
			rgba(0, 172, 193, 0) 70%
		);
		border-radius: 50%;
		filter: blur(40px);
		animation: float-blob-1 6s ease-in-out infinite;
	}

	/* Blob 2 - Top Right (Cyan) */
	.blob-2 {
		position: absolute;
		top: -10%;
		right: -10%;
		width: 500px;
		height: 500px;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(0, 172, 193, 0.6),
			rgba(0, 150, 180, 0.3),
			rgba(13, 71, 161, 0) 70%
		);
		border-radius: 50%;
		filter: blur(40px);
		animation: float-blob-2 8s ease-in-out infinite;
		animation-delay: -1s;
	}

	/* Blob 3 - Bottom Left (Deep Blue) */
	.blob-3 {
		position: absolute;
		bottom: -15%;
		left: 10%;
		width: 450px;
		height: 450px;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(13, 71, 161, 0.7),
			rgba(30, 136, 229, 0.3),
			rgba(0, 172, 193, 0) 70%
		);
		border-radius: 50%;
		filter: blur(40px);
		animation: float-blob-3 7s ease-in-out infinite;
		animation-delay: -2s;
	}

	/* Blob 4 - Bottom Right (Light Blue) */
	.blob-4 {
		position: absolute;
		bottom: -20%;
		right: -5%;
		width: 550px;
		height: 550px;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(37, 99, 235, 0.5),
			rgba(30, 136, 229, 0.2),
			rgba(13, 71, 161, 0) 70%
		);
		border-radius: 50%;
		filter: blur(40px);
		animation: float-blob-4 9s ease-in-out infinite;
		animation-delay: -3s;
	}

	/* Content Container */
	.loading-content {
		position: relative;
		z-index: 2;
		text-align: center;
		color: white;
		animation: fadeIn 0.8s ease-out forwards;
	}

	/* Logo/Branding */
	.loading-logo {
		font-size: 48px;
		font-weight: 700;
		margin-bottom: 30px;
		letter-spacing: -1px;
		animation: slideDown 0.8s ease-out forwards;
		opacity: 0;
	}

	.loading-logo-icon {
		display: inline-block;
		width: 60px;
		height: 60px;
		background: linear-gradient(135deg, #00d4ff, #0099ff);
		border-radius: 12px;
		margin-right: 15px;
		vertical-align: middle;
		animation: rotate 8s linear infinite;
	}

	/* Subtitle */
	.loading-subtitle {
		font-size: 16px;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 50px;
		font-weight: 300;
		letter-spacing: 0.5px;
		animation: slideUp 0.8s ease-out 0.2s forwards;
		opacity: 0;
	}

	/* Progress Bar */
	.progress-container {
		width: 280px;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 30px;
		animation: slideUp 0.8s ease-out 0.4s forwards;
		opacity: 0;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #00d4ff, #0099ff, #0055ff);
		border-radius: 2px;
		transition: width 0.3s ease;
		box-shadow: 0 0 20px rgba(0, 212, 255, 0.6);
	}

	/* Loading Dots */
	.loading-dots {
		display: flex;
		gap: 8px;
		justify-content: center;
		animation: slideUp 0.8s ease-out 0.6s forwards;
		opacity: 0;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.7);
		animation: bounce 1.4s ease-in-out infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	/* Loading Text */
	.loading-text {
		margin-top: 30px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.7);
		letter-spacing: 1px;
		text-transform: uppercase;
		font-weight: 500;
		animation: slideUp 0.8s ease-out 0.8s forwards;
		opacity: 0;
	}

	.loading-text::after {
		content: '';
		animation: dots 1.4s steps(4, end) infinite;
	}

	/* Animations */
	@keyframes float-blob-1 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -30px) scale(1.05);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.95);
		}
	}

	@keyframes float-blob-2 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(-30px, 30px) scale(0.95);
		}
		66% {
			transform: translate(20px, -20px) scale(1.05);
		}
	}

	@keyframes float-blob-3 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(-25px, 25px) scale(1.02);
		}
		66% {
			transform: translate(25px, -25px) scale(0.98);
		}
	}

	@keyframes float-blob-4 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(20px, -25px) scale(0.98);
		}
		66% {
			transform: translate(-20px, 25px) scale(1.02);
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-15px);
		}
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes dots {
		0%,
		20% {
			content: '';
		}
		40% {
			content: '.';
		}
		60% {
			content: '..';
		}
		80%,
		100% {
			content: '...';
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.loading-logo {
			font-size: 36px;
		}

		.loading-subtitle {
			font-size: 14px;
		}

		.blob-1,
		.blob-2,
		.blob-3,
		.blob-4 {
			filter: blur(30px);
		}

		.progress-container {
			width: 220px;
		}
	}

	@media (max-width: 480px) {
		.loading-logo {
			font-size: 28px;
		}

		.loading-subtitle {
			font-size: 12px;
		}

		.blob-1,
		.blob-2,
		.blob-3,
		.blob-4 {
			width: 350px;
			height: 350px;
		}

		.progress-container {
			width: 180px;
		}
	}
</style>
