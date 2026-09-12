<script lang="ts">
    import { ArrowLeft, ShieldCheck } from "lucide-svelte";
</script>

<svelte:head>
    <title>Privacy Notice — CEDIMS</title>
</svelte:head>

<div class="min-h-dvh bg-surface-muted px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
        <a
            href="/auth/login"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-gov-blue transition-colors mb-6"
        >
            <ArrowLeft size={16} strokeWidth={2} />
            Back to sign in
        </a>

        <div class="rounded-2xl border border-border-subtle bg-surface-white p-6 sm:p-10 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
                <div class="rounded-xl bg-gov-blue/10 p-2.5 text-gov-blue">
                    <ShieldCheck size={22} strokeWidth={2} />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-text-primary">Privacy Notice</h1>
                    <p class="text-sm text-text-secondary">
                        CEDIMS — DepEd Calapan East District
                    </p>
                </div>
            </div>

            <div class="space-y-6 text-sm leading-7 text-text-secondary">
                <p>
                    This notice explains what personal information CEDIMS collects, why it is
                    collected, and how it is handled. It is issued in line with the
                    <strong class="text-text-primary">Data Privacy Act of 2012 (Republic Act No. 10173)</strong>
                    and its Implementing Rules and Regulations.
                </p>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">1. Information we collect</h2>
                    <ul class="list-disc pl-5 space-y-1.5">
                        <li><strong class="text-text-primary">Account details</strong> — your name, email address, assigned role, school and district.</li>
                        <li><strong class="text-text-primary">Teaching assignment</strong> — the subjects and grade levels assigned to you.</li>
                        <li><strong class="text-text-primary">Documents you submit</strong> — Daily Lesson Logs, Instructional Supervisory Plans and Reports, including text read from them for search and automatic detection of subject, grade level and week.</li>
                        <li><strong class="text-text-primary">Submission records</strong> — dates, deadlines, compliance status, and the remarks your reviewers leave.</li>
                        <li><strong class="text-text-primary">Profile photo</strong> — only if you choose to upload one.</li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">2. Why we collect it</h2>
                    <p>
                        Your information is processed solely for instructional monitoring and
                        supervision within DepEd Calapan East District — recording submissions,
                        tracking compliance against deadlines, enabling supervisory review and
                        remarks, and producing school and district reports. It is not used for
                        advertising, and it is not sold or shared with third parties for their
                        own purposes.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">3. Who can see your information</h2>
                    <p class="mb-2">Access follows your role and the school or district you belong to:</p>
                    <ul class="list-disc pl-5 space-y-1.5">
                        <li><strong class="text-text-primary">Teachers</strong> see only their own submissions and records.</li>
                        <li><strong class="text-text-primary">Master Teachers and School Heads</strong> see submissions from their own school.</li>
                        <li><strong class="text-text-primary">District Supervisors</strong> see submissions across the schools in their district.</li>
                    </ul>
                    <p class="mt-2">
                        These limits are enforced by the system itself, not only by the screens
                        you see.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">4. How it is protected</h2>
                    <ul class="list-disc pl-5 space-y-1.5">
                        <li>Access requires an account and password; sessions are encrypted in transit.</li>
                        <li>Each document is fingerprinted (SHA-256) so any alteration is detectable, and carries a QR code for verification.</li>
                        <li>Review actions are recorded so the history of a document cannot be quietly rewritten.</li>
                        <li>Documents are held in access-controlled storage, not in a public location.</li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">5. How long it is kept</h2>
                    <p>
                        Submissions and their compliance records are retained for as long as
                        the District Office requires them for monitoring, reporting and
                        recordkeeping, consistent with DepEd retention rules. Accounts are
                        deactivated when a user leaves the district.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">6. Your rights</h2>
                    <p class="mb-2">
                        Under the Data Privacy Act you have the right to be informed, to access
                        your personal data, to correct inaccurate entries, to object to certain
                        processing, to request erasure or blocking where the law allows, to data
                        portability, and to seek redress for a violation.
                    </p>
                    <p>
                        To exercise any of these, contact the District Office using the details
                        below. Requests involving official submission records may be subject to
                        DepEd retention and audit requirements.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">7. Security verification</h2>
                    <p>
                        The sign-in page uses Google reCAPTCHA to distinguish real users from
                        automated attempts. Google may process device and usage signals for this
                        purpose, subject to Google's own privacy policy and terms.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">8. Contact</h2>
                    <p>
                        Calapan East District Office, Calapan City, Oriental Mindoro<br />
                        Email: support@cedims.gov.ph · Phone: (043) 288-1234
                    </p>
                </section>

                <p class="pt-4 border-t border-border-subtle text-xs text-text-muted">
                    This notice may be updated as the system changes. Material changes will be
                    communicated through the District Office.
                </p>
            </div>
        </div>
    </div>
</div>
