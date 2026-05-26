/**
 * Predictive Compliance Analytics Utility
 * Innovative Feature: Phase 4.4 implementation.
 * Uses simple linear regression and weighted moving averages on historical submission 
 * data to forecast future compliance risk without heavy server-side ML.
 */

export interface PredictionResult {
    riskScore: number; // 0-100
    label: 'On-Track' | 'At-Risk' | 'Critical';
    trend: 'Improving' | 'Stable' | 'Declining';
    message: string;
}

/**
 * Analyzes submission history to predict the likelihood of next week's compliance.
 * @param submissions Array of submission objects with week_number and compliance_status
 * @param lookback Number of weeks to include in analysis
 */
export function analyzeComplianceRisk(submissions: any[], lookback: number = 8): PredictionResult {
    if (!submissions || submissions.length < 2) {
        return {
            riskScore: 0,
            label: 'On-Track',
            trend: 'Stable',
            message: 'Insufficent data for predictive modeling.'
        };
    }

    // 1. Prepare data (numeric mapping: compliant=0, late=1, non-compliant=2)
    const data = [...submissions]
        .sort((a, b) => b.week_number - a.week_number) // Recent first
        .slice(0, lookback)
        .reverse()
        .map((s, index) => ({
            x: index,
            y: s.compliance_status === 'compliant' ? 0 : (s.compliance_status === 'late' ? 1 : 2)
        }));

    const n = data.length;
    if (n < 2) return { riskScore: 0, label: 'On-Track', trend: 'Stable', message: 'Steady state.' };

    // 2. Simple Linear Regression (y = mx + b)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const point of data) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // 3. Compute Risk Score
    // Weight factors: 
    // - Average status (baseline performance)
    // - Last status (momentum)
    // - Slope (direction of change)
    const avgY = sumY / n;
    const lastY = data[n - 1].y;

    // Normalize risk to 0-100
    // (avgY * 25) + (lastY * 25) + (slope * 50) 
    // Max avgY = 2, Max lastY = 2, Max slope ~ 2 (sudden failure)
    let rawScore = (avgY * 20) + (lastY * 20) + (slope * 30);
    let riskScore = Math.min(100, Math.max(0, Math.round(rawScore * 20))); // Scaled for UI

    // 4. Determine Label & Trend
    let label: PredictionResult['label'] = 'On-Track';
    if (riskScore > 70) label = 'Critical';
    else if (riskScore > 35) label = 'At-Risk';

    let trend: PredictionResult['trend'] = 'Stable';
    if (slope > 0.1) trend = 'Declining';
    else if (slope < -0.1) trend = 'Improving';

    // 5. Generate Message
    let message = "Maintaining consistent submission patterns.";
    if (label === 'Critical') message = "Highly likely to miss or delay next week's submission based on recent breakdown.";
    else if (label === 'At-Risk') message = "Compliance consistency is wavering; monitor next week closely.";
    else if (trend === 'Improving') message = "Compliance habits are showing positive momentum.";

    return { riskScore, label, trend, message };
}

/**
 * Aggregate risk for a group of teachers (Supervisor View).
 */
export function calculateDistrictRisk(teacherSubmissions: Map<string, any[]>): number {
    let totalRisk = 0;
    let count = 0;

    teacherSubmissions.forEach((subs) => {
        const result = analyzeComplianceRisk(subs);
        totalRisk += result.riskScore;
        count++;
    });

    return count > 0 ? Math.round(totalRisk / count) : 0;
}
