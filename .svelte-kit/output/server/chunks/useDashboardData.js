function countSubmissionsByStatus(submissions) {
  let compliant = 0;
  let late = 0;
  let nonCompliant = 0;
  for (const s of submissions) {
    const cs = (s.compliance_status || "non-compliant").toLowerCase().trim();
    if (cs === "compliant" || cs === "on-time") {
      compliant++;
    } else if (cs === "late") {
      late++;
    } else {
      nonCompliant++;
    }
  }
  return { compliant, late, nonCompliant, total: compliant + late + nonCompliant };
}
function calculateCompliance(submissions, teachingLoadsCount = 0, expected, deadlineDate) {
  const counts = countSubmissionsByStatus(submissions);
  const total = counts.total;
  const rate = total > 0 ? Math.min(100, Math.round(counts.compliant / total * 100)) : 0;
  return {
    Compliant: counts.compliant,
    Late: counts.late,
    NonCompliant: counts.nonCompliant,
    totalUploaded: total,
    expected: teachingLoadsCount,
    rate
  };
}
function getComplianceClass(rate) {
  if (rate >= 80) return "text-gov-green";
  if (rate >= 50) return "text-gov-gold-dark";
  return "text-gov-red";
}
function getComplianceBgClass(rate) {
  if (rate >= 80) return "bg-gov-green/15";
  if (rate >= 50) return "bg-gov-gold/15";
  return "bg-gov-red/15";
}
export {
  getComplianceClass as a,
  calculateCompliance as c,
  getComplianceBgClass as g
};
