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
					content: `Hi there! 👋 Welcome to CEDIMS, your intelligent document management system. Let's take a quick tour of the main features you'll use every day.`
				},
				{
					title: 'Dashboard - Your Daily Overview',
					content: `When you log in, the Dashboard is your home. It shows your compliance rate, next 3 deadlines, and recent feedback from your school head.`,
					tips: '💡 Check your dashboard every morning to stay on top of deadlines!'
				},
				{
					title: 'Uploading Your DLL',
					content: `Ready to upload? Tap Upload → Select your Teaching Load → Choose file → Upload. That's it!`,
					tips: '⏰ Submit before midnight on the deadline date!'
				},
				{
					title: 'Tracking Your Submissions',
					content: `View all uploads in My Files. Status badges show: Green (✓ On-time), Yellow (⏰ Due soon), Red (! Late).`,
					tips: '📊 Track your compliance rate over time!'
				},
				{
					title: 'Getting Started',
					content: `You're all set! Start with the Dashboard, then upload your first DLL. Good luck! 🎉`
				}
			]
		},
		'Master Teacher': {
			emoji: '👨‍🏫',
			steps: [
				{
					title: 'Welcome, Master Teacher',
					content: `Hi! 👋 As a Master Teacher, you manage both your teaching and oversee your school's DLL compliance.`
				},
				{
					title: 'Dashboard - School Overview',
					content: `Your dashboard shows your compliance rate, school compliance, top teachers, and at-risk teachers.`,
					tips: '🎯 Use this to identify who needs support!'
				},
				{
					title: 'Managing School Teachers',
					content: `Tap School tab to see all teachers. Click a teacher to see their DLLs and add remarks to help improve quality.`,
					tips: '📚 Support struggling teachers and recognize excellent work!'
				},
				{
					title: 'Uploading Your Documents',
					content: `Upload DLL (with teaching load), ISP (school plan), or ISR (school report). Tap Upload and choose your document type.`,
					tips: "✅ ISP/ISR don't need a teaching load!"
				},
				{
					title: 'Viewing School Documents',
					content: `Documents tab shows all school submissions. Filter by teacher, sort by status, add remarks, export reports.`,
					tips: '📊 Export reports for your school head!'
				},
				{
					title: 'Your Next Steps',
					content: `Check Dashboard daily → Support teachers → Add remarks → Upload your ISP/ISR. You're ready to lead! 🚀`
				}
			]
		},
		'School Head': {
			emoji: '🏫',
			steps: [
				{
					title: 'Welcome, School Head',
					content: `Welcome! 👋 As School Head, you oversee the entire school's compliance and document management.`
				},
				{
					title: 'Dashboard - School Performance',
					content: `See school compliance rate, compliant/late DLLs, top teachers, and compliance trends at a glance.`,
					tips: '📊 Use this data in staff meetings to celebrate wins and address issues!'
				},
				{
					title: 'Managing Your Staff',
					content: `Tap Staff to see all teachers ranked by compliance. Click a teacher to view their submissions and add remarks.`,
					tips: '👨‍🏫 This is your main tool for teacher development!'
				},
				{
					title: 'Uploading ISP/ISR',
					content: `Tap Upload to submit ISP (School Plan) or ISR (School Report). No teaching load needed—you upload as School Head.`,
					tips: '📌 District Supervisor will review and add remarks to your submissions!'
				},
				{
					title: 'Reviewing All Submissions',
					content: `Submissions tab shows all school DLLs, Master Teacher ISP/ISR, and your own documents. Filter, sort, and add remarks.`,
					tips: '✏️ Add remarks to guide improvement!'
				},
				{
					title: 'Your Daily Workflow',
					content: `Morning: Check Dashboard → During day: Monitor staff → Afternoon: Add remarks → Weekly: Review trends. Lead your school to excellence! 🏆`
				}
			]
		},
		'District Supervisor': {
			emoji: '🏛️',
			steps: [
				{
					title: 'Welcome, District Supervisor',
					content: `Welcome! 👋 As District Supervisor, you oversee all schools. Your dashboard shows district-wide performance.`
				},
				{
					title: 'District Dashboard',
					content: `See your district's overall compliance rate, total compliant/late DLLs, and school rankings.`,
					tips: '🎯 This is your executive summary for reports!'
				},
				{
					title: 'Monitoring Schools',
					content: `Schools tab shows all schools ranked by compliance. Low compliance schools highlighted. Click to see detailed submissions.`,
					tips: '📍 Use this to prioritize support!'
				},
				{
					title: 'Reviewing District Submissions',
					content: `Submissions tab shows all ISP/ISR from School Heads and Master Teachers. Filter, add remarks, and approve.`,
					tips: '✅ Your remarks help schools improve their planning!'
				},
				{
					title: 'Alert System',
					content: `Alerts tab shows schools below 70% compliance, overdue submissions, and teachers with zero DLLs. Click an alert to investigate.`,
					tips: '🔍 Catch problems early!'
				},
				{
					title: 'Your Strategic Role',
					content: `Monitor daily → Support low-performing schools → Approve documents → Generate reports → Lead district excellence! 🌟`
				}
			]
		}
	};

	$: currentGuide = guides[$profile?.role] || guides['Teacher'];
	$: totalSteps = currentGuide.steps.length;
	$: currentGuideStep = currentGuide.steps[currentStep];
	$: progress = ((currentStep + 1) / totalSteps) * 100;

	function openGuide() {
		isOpen = true;
		currentStep = 0;
	}

	function closeGuide() {
		isOpen = false;
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
		max-width: 600px;
		width: 100%;
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
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
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
		min-height: 120px;
	}

	.guide-content p {
		font-size: 1rem;
		line-height: 1.6;
		color: #666;
		margin: 0 0 1rem 0;
	}

	.guide-tip {
		background: #fef3c7;
		border-left: 4px solid var(--color-gov-gold);
		padding: 1rem;
		border-radius: 6px;
		margin-top: 1rem;
	}

	.guide-tip span {
		font-size: 0.95rem;
		color: #666;
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
