// Mapping of PRAMAAN's capabilities to the UN Sustainable Development Goals most relevant to technical-education approval.
export interface SdgTarget { id: string; text: string }
export interface Sdg { goal: number; name: string; color: string; targets: SdgTarget[]; how: string }

export const SDGS: Sdg[] = [
  {
    goal: 4, name: 'Quality Education', color: 'C5192D',
    targets: [
      { id: '4.3', text: 'Equal access to affordable, quality technical and tertiary education' },
      { id: '4.a', text: 'Build and upgrade education facilities that are safe and effective for learning' },
    ],
    how: 'Ensures only institutions that meet faculty, safety and facility norms are approved — checked for every application.',
  },
  {
    goal: 9, name: 'Industry, Innovation and Infrastructure', color: 'F36D25',
    targets: [
      { id: '9.1', text: 'Develop quality, reliable and resilient infrastructure' },
      { id: '9.c', text: 'Increase access to information and communication technology' },
    ],
    how: 'Checks laboratory, classroom and library infrastructure against configurable norms and flags cases for physical inspection.',
  },
  {
    goal: 16, name: 'Peace, Justice and Strong Institutions', color: '00689D',
    targets: [
      { id: '16.5', text: 'Substantially reduce corruption and bribery in all their forms' },
      { id: '16.6', text: 'Develop effective, accountable and transparent institutions' },
      { id: '16.10', text: 'Ensure public access to information' },
    ],
    how: 'Forgery and reuse indicators, evidence-linked findings, explainable decisions and a tamper-evident audit trail make approvals accountable and open to scrutiny.',
  },
]

export const sdgByGoal = (g: number) => SDGS.find((s) => s.goal === g)!
