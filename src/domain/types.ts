export type { ProductSpec } from './generated/product-spec';
export type { Proposal } from './generated/ai-proposal';
import type { ProductSpec } from './generated/product-spec';
import type { Proposal } from './generated/ai-proposal';
export type Requirement = ProductSpec['requirements'][number];
export type Experience = ProductSpec['experiences'][number];
export type Component = Experience['components'][number];
export type Test = ProductSpec['tests'][number];

export interface Issue { path: string; message: string }
export type DraftRequirement = Omit<Requirement, 'acceptanceCriteria'> & { acceptanceCriteria: string[] };
export type DraftSpec = Omit<ProductSpec, 'requirements'> & { requirements: DraftRequirement[] };
export interface EditingRequirement { requirement: DraftRequirement; isNew: boolean }
export interface ReviewRecord {
  id: string;
  at: string;
  source: 'manual' | 'ai-approved' | 'rollback' | 'rejected';
  summary: string;
  revision: number;
}
export interface Workspace {
  format: 'psw-workspace';
  formatVersion: 1;
  nextRequirementNumber?: number;
  approved: ProductSpec;
  draft: DraftSpec;
  baseRevision: number;
  snapshots: ProductSpec[];
  undo: DraftSpec[];
  redo: DraftSpec[];
  editor: EditingRequirement | null;
  proposal: Proposal | null;
  proposalBase?: string;
  reviews: ReviewRecord[];
}
export type Validation<T> =
  | { valid: true; value: T; issues: [] }
  | { valid: false; issues: Issue[] };
