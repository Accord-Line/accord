import { describe, expect, it } from 'vitest';
import baseline from '../examples/intentkit/project.spec.json';
import proposal from '../examples/intentkit/custom-recipe.proposal.json';
import { inspectInput, validateProject, validateProjectSchema, validateProposal } from '../src/domain/validation';
import { simulateApply } from '../src/domain/proposal';
import { MAX_FILE_BYTES, parseProject, serializeProject } from '../src/domain/files';
import type { ProductSpec, Proposal } from '../src/domain/types';

function base(): ProductSpec {
  const check = validateProject(structuredClone(baseline));
  if (!check.valid) throw new Error(JSON.stringify(check.issues));
  return check.value;
}
function change(): Proposal {
  const check = validateProposal(structuredClone(proposal));
  if (!check.valid) throw new Error(JSON.stringify(check.issues));
  return check.value;
}

describe('original v0.1 contracts', () => {
  it('validates the unmodified baseline and its 6px / 240ms bindings', () => {
    const spec = base();
    expect(spec.experiences[0].state).toMatchObject({ lift_px: 6, duration_ms: 240 });
    expect(spec.tests[0].status).toBe('not-run');
  });
  it('validates the exact supplied proposal', () => expect(validateProposal(proposal).valid).toBe(true));
  it.each(['', '0.0.1', '9.0.0'])('rejects unsupported schema version %s', (version) => {
    expect(validateProject({ ...baseline, schemaVersion: version }).valid).toBe(false);
  });
  it('rejects unknown project properties', () => expect(validateProject({ ...baseline, apiKey: 'not-a-real-key' }).valid).toBe(false));
  it('rejects empty required fields', () => {
    const spec = structuredClone(baseline); spec.requirements[0].acceptanceCriteria = [];
    expect(validateProject(spec).valid).toBe(false);
  });
  it('distinguishes schema validity from semantic validity', () => {
    const spec = base(); spec.requirements[0].testIds = ['TEST-MISSING'];
    expect(validateProjectSchema(spec).valid).toBe(true);
    expect(validateProject(spec).valid).toBe(false);
  });
});

describe('reference, identity and runtime contracts', () => {
  it('rejects duplicate IDs across object kinds', () => {
    const spec = base(); spec.tests[0].id = spec.requirements[0].id;
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects duplicate component IDs', () => {
    const spec = base(); spec.experiences[0].components[1].id = spec.experiences[0].components[0].id;
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects event targets outside their own experience', () => {
    const spec = base(); spec.experiences[0].events[0].componentId = 'CMP-MISSING';
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects missing state bindings', () => {
    const spec = base(); spec.experiences[0].components[0].bindings = { hoverLiftPx: 'missing' };
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects unsupported binding properties', () => {
    const spec = base(); spec.experiences[0].components[0].bindings = { background: 'lift_px' };
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects out-of-range bound card values', () => {
    const spec = base(); spec.experiences[0].state.lift_px = 25;
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects inverted ranges', () => {
    const spec = base(); spec.experiences[0].components[1].props.min = 50;
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects unknown action state targets', () => {
    const spec = base(); spec.experiences[0].events[0].actions = [{ kind: 'setState', stateKey: 'missing', value: true }];
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects toggle on numeric state', () => {
    const spec = base(); spec.experiences[0].events[0].actions = [{ kind: 'toggleState', stateKey: 'lift_px' }];
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects setState with a different declared value type', () => {
    const spec = base(); spec.experiences[0].events[0].actions = [{ kind: 'setState', stateKey: 'lift_px', value: '10' }];
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects setState actions that exceed input or bound-property ranges', () => {
    const spec = base(); spec.experiences[0].events[0].actions = [{ kind: 'setState', stateKey: 'lift_px', value: 99 }];
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects default placeholder requirements and whitespace', () => {
    const spec = base(); spec.requirements[0].title = '新的产品需求';
    expect(validateProject(spec).valid).toBe(false);
    spec.requirements[0].title = '   ';
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects inconsistent bidirectional links', () => {
    const spec = base(); spec.experiences[0].requirementIds = [];
    expect(validateProject(spec).valid).toBe(false);
  });
  it('rejects dangling evidence and future history revisions', () => {
    const spec = base(); spec.evidence = [{ id: 'EVD-001', relatedId: 'REQ-MISSING', category: 'schema', status: 'pass', description: '' }];
    expect(validateProject(spec).valid).toBe(false);
    spec.evidence = []; spec.history[0].revision = 2;
    expect(validateProject(spec).valid).toBe(false);
  });
  it('requires evidence for externally verified tests', () => {
    const spec = base(); spec.tests[0].status = 'external-verified';
    expect(validateProject(spec).valid).toBe(false);
  });
});

describe('untrusted proposals and atomic simulation', () => {
  it('simulates all three additions without mutating or approving the baseline', () => {
    const spec = base(); const before = structuredClone(spec);
    const result = simulateApply(spec, proposal);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.value.requirements).toHaveLength(2);
    expect(result.value.experiences).toHaveLength(2);
    expect(result.value.tests).toHaveLength(2);
    expect(result.value.revision).toBe(1);
    expect(result.value.requirements[0]).toEqual(before.requirements[0]);
    expect(result.value.experiences[0]).toEqual(before.experiences[0]);
    expect(result.value.tests[0]).toEqual(before.tests[0]);
    expect(spec).toEqual(before);
  });
  it.each([0, 2])('rejects invalid or stale baseRevision %i', (revision) => {
    const p = { ...proposal, baseRevision: revision };
    expect(simulateApply(base(), p).valid).toBe(false);
  });
  it('rejects the entire proposal when any new reference is broken', () => {
    const spec = base(); const p = change();
    const op = p.operations[0];
    if (op.op === 'addRequirement') op.requirement.experienceIds = ['EXP-MISSING'];
    expect(simulateApply(spec, p).valid).toBe(false);
    expect(spec).toEqual(baseline);
  });
  it('rejects duplicate additions', () => {
    const p = change(); p.operations.push(structuredClone(p.operations[0]));
    expect(simulateApply(base(), p).valid).toBe(false);
  });
  it('rejects unknown operations', () => expect(validateProposal({ ...proposal, operations: [{ op: 'exec', script: 'alert(1)' }] }).valid).toBe(false));
  it.each(['passed-local-scenario', 'external-verified'])('AI cannot self-certify %s', (status) => {
    const p = structuredClone(proposal); const operation = p.operations[2];
    if (operation.test) operation.test.status = status;
    expect(validateProposal(p).valid).toBe(false);
  });
  it('AI update cannot forge success or change stable IDs', () => {
    const p = change();
    expect(validateProposal({ ...p, operations: [{ op: 'updateTest', id: 'TEST-IK-001', fields: { status: 'external-verified' } }] }).valid).toBe(false);
    expect(validateProposal({ ...p, operations: [{ op: 'updateRequirement', id: 'REQ-IK-001', fields: { id: 'REQ-IK-999' } }] }).valid).toBe(false);
  });
  it('rejects unknown components and arbitrary fetch actions', () => {
    const text = JSON.stringify(proposal);
    expect(validateProposal(JSON.parse(text.replace('textInput', 'evalJS'))).valid).toBe(false);
    expect(validateProposal(JSON.parse(text.replace('showMessage', 'fetchURL'))).valid).toBe(false);
  });
  it('rejects missing update targets without mutating base', () => {
    const spec = base();
    const p = { ...proposal, operations: [{ op: 'updateRequirement', id: 'REQ-MISSING', fields: { title: 'Changed' } }] };
    expect(simulateApply(spec, p).valid).toBe(false);
    expect(spec).toEqual(baseline);
  });
  it('simulates supported updates and invalidates updated test status', () => {
    const p = { ...proposal, operations: [
      { op: 'updateRequirement', id: 'REQ-IK-001', fields: { title: 'Changed title' } },
      { op: 'updateExperience', id: 'EXP-IK-001', fields: { title: 'Changed experience' } },
      { op: 'updateTest', id: 'TEST-IK-001', fields: { expected: 'Updated expectation' } },
    ] };
    const result = simulateApply(base(), p);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.value.requirements[0].title).toBe('Changed title');
    expect(result.value.experiences[0].title).toBe('Changed experience');
    expect(result.value.tests[0].status).toBe('not-run');
  });
});

describe('JSON boundary', () => {
  it('round-trips all fields and references without dropping data', () => expect(parseProject(serializeProject(base()))).toEqual({ valid: true, value: baseline, issues: [] }));
  it('rejects malformed, oversized and unsupported files', () => {
    expect(parseProject('{').valid).toBe(false);
    expect(parseProject('x'.repeat(MAX_FILE_BYTES + 1)).valid).toBe(false);
    expect(parseProject('null').valid).toBe(false);
  });
  it.each(['__proto__', 'constructor', 'prototype'])('rejects malicious key %s at any depth', (key) => {
    const p = JSON.parse(`{"outer":{"${key}":"unsafe"}}`);
    expect(inspectInput(p)).toHaveLength(1);
  });
  it('rejects cycles and excessive depth', () => {
    const cycle: { next?: unknown } = {}; cycle.next = cycle;
    expect(inspectInput(cycle)).toHaveLength(1);
    let deep: object = {};
    for (let i = 0; i < 82; i++) deep = { next: deep };
    expect(inspectInput(deep)).toHaveLength(1);
  });
  it('keeps imported HTML as inert text rather than interpreting it', () => {
    const spec = base(); spec.requirements[0].title = '<img src=x onerror=alert(1)>';
    const result = parseProject(serializeProject(spec));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value.requirements[0].title).toBe(spec.requirements[0].title);
  });
});
