// Supported Employment stages - trigger Missing/Overdue Reports check
export const SUPPORTED_EMPLOYMENT_STAGES = [
  'Job Development',
  'Training / OS 1',
  'Training / OS 2',
  'Stabilization / ES',
] as const;

export type SupportedEmploymentStage = (typeof SUPPORTED_EMPLOYMENT_STAGES)[number];

export const ALL_VPR_SERVICE_STAGES = [
  'Job Development',
  'Training / OS 1',
  'Training / OS 2',
  'Stabilization / ES',
  'Work Readiness Training',
  'IJP',
  'CWAT',
  'Job Coaching',
  'Work Evaluation',
] as const;

export const SUPERADMIN_EMAIL = 'bryan.evans@thejoshuatree.org';
export const ORG_DOMAIN = 'thejoshuatree.org';
export const FROM_EMAIL = 'noreply@thejoshuatree.org';

// GVRA deadline: 5:01pm on 10th = late
export const GVRA_DEADLINE_HOUR = 17;
export const GVRA_DEADLINE_MINUTE = 1;
export const GVRA_DEADLINE_DAY = 10;
