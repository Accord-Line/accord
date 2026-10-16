/* Generated from the original v0.1 JSON Schema. Run npm run generate:types. */

export type ObjectId = string;
export type Action =
  | {
      kind: "setState";
      stateKey: string;
      value: string | number | boolean | null;
    }
  | {
      kind: "toggleState";
      stateKey: string;
    }
  | {
      kind: "showMessage";
      message: string;
    }
  | {
      kind: "validateFields";
      stateKeys: string[];
    };

export interface PSWProductSpecificationIRDraftV01 {
  schemaVersion: "0.1.0";
  project: {
    id: string;
    title: string;
    description: string;
    sourceUrl: string;
  };
  revision: number;
  intent: string;
  requirements: Requirement[];
  experiences: Experience[];
  tests: Test[];
  decisions: Decision[];
  history: History[];
  evidence: Evidence[];
  unstructuredNotes: string[];
}
export interface Requirement {
  id: ObjectId;
  title: string;
  description: string;
  status: "draft" | "approved" | "deprecated";
  constraints: string[];
  /**
   * @minItems 1
   */
  acceptanceCriteria: [string, ...string[]];
  experienceIds: ObjectId[];
  testIds: ObjectId[];
}
export interface Experience {
  id: ObjectId;
  title: string;
  description: string;
  requirementIds: ObjectId[];
  state: {
    [k: string]: string | number | boolean | null;
  };
  components: Component[];
  events: Event[];
}
export interface Component {
  id: ObjectId;
  type: "text" | "card" | "button" | "textInput" | "numberInput" | "select" | "slider" | "switch" | "statusMessage";
  label: string;
  stateKey: string | null;
  bindings?: {
    [k: string]: string;
  };
  props: {
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    placeholder?: string;
    hoverLiftPx?: number;
    durationMs?: number;
  };
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
}
export interface Event {
  componentId: ObjectId;
  event: "click" | "change" | "hoverStart" | "hoverEnd";
  actions: Action[];
}
export interface Test {
  id: ObjectId;
  requirementId: ObjectId;
  title: string;
  procedure: string;
  expected: string;
  status: "not-run" | "passed-local-scenario" | "failed-local-scenario" | "external-verified";
}
export interface Decision {
  id: ObjectId;
  summary: string;
  rationale: string;
  revision: number;
}
export interface History {
  revision: number;
  summary: string;
  source: "import" | "manual" | "ai-approved" | "rollback";
}
export interface Evidence {
  id: ObjectId;
  relatedId: ObjectId;
  category: "schema" | "reference" | "scenario" | "external-implementation";
  status: "not-run" | "pass" | "fail";
  description: string;
}

export type ProductSpec = PSWProductSpecificationIRDraftV01;
