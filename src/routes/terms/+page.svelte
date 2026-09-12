<script lang="ts">
    import { ArrowLeft, FileText } from "lucide-svelte";
</script>

<svelte:head>
    <title>Terms of Use — CEDIMS</title>
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
                    <FileText size={22} strokeWidth={2} />
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-text-primary">Terms of Use</h1>
                    <p class="text-sm text-text-secondary">
                        CEDIMS — DepEd Calapan East District
                    </p>
                </div>
            </div>

            <div class="space-y-6 text-sm leading-7 text-text-secondary">
                <p>
                    CEDIMS is an official system of the DepEd Calapan East District Office. By
                    signing in, you agree to the terms below.
                </p>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">1. Who may use it</h2>
                    <p>
                        Accounts are issued by the District Office to teachers, Master Teachers,
                        School Heads and District Supervisors. Accounts are personal. Do not
                        share your password or let another person work under your account — any
                        submission or remark made under it is treated as yours.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">2. Acceptable use</h2>
                    <ul class="list-disc pl-5 space-y-1.5">
                        <li>Upload only genuine instructional documents that are yours to submit.</li>
                        <li>Do not upload content unrelated to instructional monitoring.</li>
                        <li>Do not attempt to access records belonging to other schools or districts, or to bypass the system's access limits.</li>
                        <li>Do not upload material that infringes another person's rights.</li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">3. Accuracy of submissions</h2>
                    <p>
                        You are responsible for the accuracy and completeness of what you
                        submit, including the teaching load, week and document type attached to
                        it. The system reads details from your document automatically to save
                        you time, but the detected values are a suggestion — confirm them before
                        archiving.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">4. Records and integrity</h2>
                    <p>
                        Submissions are archived as official records. Each is fingerprinted and
                        carries a verification code, and reviewer remarks are kept as a history
                        rather than overwritten. Records are not deleted on request once
                        archived, since they form part of the District's monitoring trail.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">5. Availability</h2>
                    <p>
                        The system is provided as-is for official use. It may be unavailable
                        during maintenance or network interruption. Uploads made without a
                        connection are held on your device and sent automatically once a
                        connection returns — keep the app installed and open it periodically so
                        pending work can finish.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">6. Personal data</h2>
                    <p>
                        Handling of personal information is described in the
                        <a href="/privacy" class="font-semibold text-gov-blue hover:underline">Privacy Notice</a>,
                        issued under the Data Privacy Act of 2012 (RA 10173). Your use of CEDIMS
                        is also subject to that notice.
                    </p>
                </section>

                <section>
                    <h2 class="text-base font-bold text-text-primary mb-2">7. Suspension</h2>
                    <p>
                        The District Office may suspend or withdraw access for misuse, for
                        breach of these terms, or when a user leaves the district.
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
                    These terms may be updated as the system changes. Continued use after an
                    update means acceptance of the revised terms.
                </p>
            </div>
        </div>
    </div>
</div>
