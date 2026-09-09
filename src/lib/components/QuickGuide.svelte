<script lang="ts">
	import { profile } from '$lib/utils/auth';
	import { ChevronLeft, ChevronRight, X } from 'lucide-svelte';

	let isOpen = false;
	let currentStep = 0;

	// Get role-specific guides
	const guides: Record<string, any> = {
		Teacher: {
			emoji: '🍎',
			steps: [
				{
					title: 'Welcome to CEDIMS',
					content: `Hi there! 👋 Welcome to CEDIMS. Let's explore the main tabs and features you'll use every day.`,
					target: null
				},
				{
					title: 'Dashboard Tab',
					content: `Your home base. Shows your compliance rate, next 3 deadlines, and recent feedback.`,
					tips: '💡 Check here every morning!',
					target: 'dashboard'
				},
				{
					title: 'Upload Tab',
					content: `Upload → Select Teaching Load → Choose file → Done! Submit before midnight.`,
					tips: '⏰ Deadline-aware uploads!',
					target: 'upload'
				},
				{
					title: 'Archive Tab',
					content: `View all your submissions. Status badges: Green (On-time), Yellow (Due soon), Red (Late).`,
					tips: '📊 Track compliance over time!',
					target: 'archive'
				},
				{
					title: 'Teaching Load Tab',
					content: `Manage your teaching loads. Required before uploading documents. Keep it updated!`,
					tips: '✏️ Update regularly!',
					target: 'load'
				},
				{
					title: "You're Ready!",
					content: `Start with Dashboard → Upload first DLL → Track progress. You've got this! 🎉`,
					target: null
				}
			]
		},
		'Master Teacher': {
			emoji: '👨‍🏫',
			steps: [
				{
					title: 'Welcome, Master Teacher',
					content: `You manage teaching AND oversee school compliance. Let's explore your key tabs.`,
					target: null
				},
				{
					title: 'Dashboard Tab',
					content: `Your compliance, school compliance, top teachers, at-risk teachers. Your command center.`,
					tips: '🎯 Identify who needs support!',
					target: 'dashboard'
				},
				{
					title: 'School Tab',
					content: `See all teachers ranked by compliance. Click a teacher to view DLLs and add remarks.`,
					tips: '📚 Support and recognize excellence!',
					target: 'school'
				},
				{
					title: 'Upload Tab',
					content: `Upload DLL (with teaching load), ISP (school plan), or ISR (school report).`,
					tips: "✅ ISP/ISR don't need teaching load!",
					target: 'upload'
				},
				{
					title: 'Documents Tab',
					content: `All school submissions in one place. Filter, sort, add remarks, export reports.`,
					tips: '📊 Reports impress your principal!',
					target: 'documents'
				},
				{
					title: 'Ready to Lead!',
					content: `Dashboard → Support teachers → Upload ISP/ISR → Export reports. Lead with data! 🚀`,
					target: null
				}
			]
		},
		'School Head': {
			emoji: '🏫',
			steps: [
				{
					title: 'Welcome, School Head',
					content: `You oversee school compliance and document management. Let's master the key tabs.`,
					target: null
				},
				{
					title: 'Dashboard Tab',
					content: `School compliance rate, compliant/late DLLs, top teachers, trends. Your performance center.`,
					tips: '📊 Use this in staff meetings!',
					target: 'dashboard'
				},
				{
					title: 'Staff Tab',
					content: `All teachers ranked by compliance. Click any teacher to view submissions and add remarks.`,
					tips: '👨‍🏫 Your main development tool!',
					target: 'staff'
				},
				{
					title: 'Upload Tab',
					content: `Submit ISP (School Plan) or ISR (School Report). No teaching load needed. You upload as School Head.`,
					tips: '📌 District Supervisor reviews these!',
					target: 'upload'
				},
				{
					title: 'Submissions Tab',
					content: `All school DLLs, Master Teacher ISP/ISR, your documents. Filter, sort, add remarks, approve.`,
					tips: '✏️ Guide improvement with remarks!',
					target: 'submissions'
				},
				{
					title: 'Lead with Excellence!',
					content: `Dashboard daily → Monitor staff → Add remarks → Upload ISP/ISR → Lead your school! 🏆`,
					target: null
				}
			]
		},
		'District Supervisor': {
			emoji: '🏛️',
			steps: [
				{
					title: 'Welcome, District Supervisor',
					content: `You oversee ALL schools. Let's explore your district-wide management tabs.`,
					target: null
				},
				{
					title: 'Dashboard Tab',
					content: `District compliance rate, total compliant/late, school rankings. Your executive summary.`,
					tips: '🎯 Perfect for reports!',
					target: 'dashboard'
				},
				{
					title: 'Schools Tab',
					content: `All schools ranked by compliance. Red schools = below 70%. Click to see detailed submissions.`,
					tips: '📍 Prioritize support here!',
					target: 'schools'
				},
				{
					title: 'Submissions Tab',
					content: `All ISP/ISR from School Heads & Master Teachers. Filter, sort, add remarks, approve submissions.`,
					tips: '✅ Your remarks drive improvement!',
					target: 'submissions'
				},
				{
					title: 'Alerts Tab',
					content: `Schools below 70%, overdue submissions, missing DLLs. Click alerts to investigate and act fast.`,
					tips: '🔍 Stay ahead of problems!',
					target: 'alerts'
				},
				{
					title: 'Lead the District!',
					content: `Monitor daily → Support struggling schools → Approve documents → Reports → Excellence! 🌟`,
					target: null
				}
			]
		}
	};

	$: currentGuide = guides[$profile?.role] || guides['Teacher'];
	$: totalSteps = currentGuide.steps.length;
	$: currentGuideStep = currentGuide.steps[currentStep];
	$: progress = ((currentStep + 1) / totalSteps) * 100;
	$: currentTarget = currentGuideStep?.target || null;

	function highlightTab() {
		if (!currentTarget) return;
		removeHighlight();
		// Search for the nav element with data-nav attribute
		const navButton = document.querySelector(`[data-nav="${currentTarget}"]`);
		if (navButton) {
			navButton.classList.add('guide-highlight');
			// Scroll into view
			navButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	$: if (isOpen && currentTarget) {
		// Highlight tab after modal renders - retry a few times
		setTimeout(() => highlightTab(), 100);
		setTimeout(() => highlightTab(), 300);
		setTimeout(() => highlightTab(), 500);
	}

	function openGuide() {
		isOpen = true;
		currentStep = 0;
	}

	function closeGuide() {
		isOpen = false;
		removeHighlight();
	}

	function removeHighlight() {
		document.querySelectorAll('button[data-nav].guide-highlight').forEach(btn => {
			btn.classList.remove('guide-highlight');
		});
	}

	function nextStep() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
		} else {
			closeGuide();
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}
</script>

<!-- Quick Guide Button (in TopBar or Navigation) -->
<button
	on:click={openGuide}
	class="guide-button"
	aria-label="Open quick guide"
	title="Quick guide for {$profile?.role}"
>
	<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
	</svg>
</button>

<!-- Quick Guide Modal -->
{#if isOpen}
	<div class="guide-overlay" on:click={closeGuide} on:keydown={(e) => e.key === 'Escape' && closeGuide()}>
		<div class="guide-modal" on:click={(e) => e.stopPropagation()}>
			<div class="guide-header">
				<div class="guide-info">
					<div class="guide-role-badge">
						{currentGuide.emoji}
						{$profile?.role}
					</div>
					<h2 class="guide-title">{currentGuideStep.title}</h2>
				</div>
				<button class="guide-close" on:click={closeGuide} aria-label="Close guide">
					<X size={24} />
				</button>
			</div>

			<div class="guide-content">
				<p>{currentGuideStep.content}</p>
				{#if currentGuideStep.tips}
					<div class="guide-tip">
						<span>{currentGuideStep.tips}</span>
					</div>
				{/if}
			</div>

			<div class="guide-footer">
				<div class="guide-steps">
					<span class="guide-step-number">{currentStep + 1} of {totalSteps}</span>
					<div class="guide-progress">
						<div class="guide-progress-fill" style="width: {progress}%"></div>
					</div>
				</div>

				<div class="guide-buttons">
					<button
						class="guide-btn guide-btn-secondary"
						on:click={prevStep}
						disabled={currentStep === 0}
					>
						<ChevronLeft size={20} />
						Back
					</button>
					<button class="guide-btn guide-btn-primary" on:click={nextStep}>
						{currentStep === totalSteps - 1 ? 'Done' : 'Next'}
						<ChevronRight size={20} />
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.guide-button {
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 200ms ease;
	}

	.guide-button:hover {
		color: var(--color-gov-blue);
		background-color: rgba(37, 99, 235, 0.1);
	}

	.guide-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 1rem;
		animation: fadeIn 200ms ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.guide-modal {
		background: white;
		border-radius: 16px;
		max-width: 700px;
		width: 90%;
		max-height: 85vh;
		overflow-y: auto;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		animation: slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.guide-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.guide-info {
		flex: 1;
	}

	.guide-role-badge {
		display: inline-block;
		background: var(--color-gov-blue);
		color: white;
		padding: 0.4rem 0.8rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 600;
		margin-bottom: 0.8rem;
	}

	.guide-title {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--color-text-primary);
		margin: 0;
		letter-spacing: -0.5px;
	}

	.guide-close {
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 200ms ease;
	}

	.guide-close:hover {
		color: var(--color-text-primary);
	}

	.guide-content {
		padding: 2rem;
		min-height: 100px;
		max-height: 50vh;
		overflow-y: auto;
	}

	.guide-content p {
		font-size: 1.05rem;
		line-height: 1.7;
		color: #444;
		margin: 0 0 1.2rem 0;
		font-weight: 500;
	}

	.guide-tip {
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		border-left: 5px solid var(--color-gov-gold);
		padding: 1.2rem;
		border-radius: 8px;
		margin-top: 1.5rem;
		box-shadow: 0 2px 8px rgba(255, 193, 7, 0.15);
	}

	.guide-tip span {
		font-size: 1rem;
		color: #333;
		font-weight: 600;
		line-height: 1.6;
	}

	.guide-footer {
		padding: 2rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.guide-steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.guide-step-number {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-gov-blue);
	}

	.guide-progress {
		height: 4px;
		background: #e5e7eb;
		border-radius: 2px;
		overflow: hidden;
	}

	.guide-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-gov-blue), #3b82f6);
		transition: width 300ms ease;
	}

	.guide-buttons {
		display: flex;
		gap: 1rem;
	}

	.guide-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 200ms ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.95rem;
	}

	.guide-btn-secondary {
		background: #e5e7eb;
		color: var(--color-text-primary);
	}

	.guide-btn-secondary:hover:not(:disabled) {
		background: #d1d5db;
	}

	.guide-btn-primary {
		background: var(--color-gov-blue);
		color: white;
		flex: 1;
	}

	.guide-btn-primary:hover {
		background: var(--color-gov-blue-dark);
	}

	.guide-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Tab highlighting */
	:global([data-nav].guide-highlight) {
		outline: 4px solid var(--color-gov-gold) !important;
		outline-offset: 3px !important;
		box-shadow: 0 0 0 12px rgba(255, 193, 7, 0.3), 0 0 20px rgba(255, 193, 7, 0.6) !important;
		animation: tabPulse 1.2s ease-in-out infinite;
		position: relative !important;
		z-index: 50 !important;
	}

	@keyframes tabPulse {
		0%, 100% {
			box-shadow: 0 0 0 8px rgba(255, 193, 7, 0.2), 0 0 15px rgba(255, 193, 7, 0.4);
		}
		50% {
			box-shadow: 0 0 0 14px rgba(255, 193, 7, 0.4), 0 0 30px rgba(255, 193, 7, 0.8);
		}
	}

	@media (max-width: 768px) {
		.guide-header {
			padding: 1.5rem;
		}

		.guide-content {
			padding: 1.5rem;
		}

		.guide-footer {
			padding: 1.5rem;
		}

		.guide-title {
			font-size: 1.2rem;
		}
	}
</style>
