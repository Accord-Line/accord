/* Generated from the original v0.1 JSON Schema. Run npm run generate:types. */

export interface PSWChangeProposalDraftV01 {
  proposalId: string;
  baseRevision: number;
  summary: string;
  rationale: string;
  risks: string[];
  /**
   * @minItems 1
   */
  operations: [
    (
      | {
          op: "addRequirement";
          requirement: Requirement;
        }
      | {
          op: "updateRequirement";
          id: string;
          fields: {
            title?: string;
            description?: string;
            status?: "draft" | "approved" | "deprecated";
            constraints?: string[];
            /**
             * @minItems 1
             */
            acceptanceCriteria?: [string, ...string[]];
            experienceIds?: string[];
            testIds?: string[];
          };
        }
      | {
          op: "addExperience";
          experience: Experience;
        }
      | {
          op: "updateExperience";
          id: string;
          fields: {
            title?: string;
            description?: string;
            requirementIds?: string[];
            state?: {
              [k: string]: string | number | boolean | null;
            };
            components?: Component[];
            events?: Event[];
          };
        }
      | {
          op: "addTest";
          test: Test & {
            status?: "not-run";
          };
        }
      | {
          op: "updateTest";
          id: string;
          fields: {
            title?: string;
            procedure?: string;
            expected?: string;
            status?: "not-run";
          };
        }
      | {
          op: "updateDocument";
          markdown: string;
        }
    ),
    ...(
      | {
          op: "addRequirement";
          requirement: Requirement;
        }
      | {
          op: "updateRequirement";
          id: string;
          fields: {
            title?: string;
            description?: string;
            status?: "draft" | "approved" | "deprecated";
            constraints?: string[];
            /**
             * @minItems 1
             */
            acceptanceCriteria?: [string, ...string[]];
            experienceIds?: string[];
            testIds?: string[];
          };
        }
      | {
          op: "addExperience";
          experience: Experience;
        }
      | {
          op: "updateExperience";
          id: string;
          fields: {
            title?: string;
            description?: string;
            requirementIds?: string[];
            state?: {
              [k: string]: string | number | boolean | null;
            };
            components?: Component[];
            events?: Event[];
          };
        }
      | {
          op: "addTest";
          test: Test & {
            status?: "not-run";
          };
        }
      | {
          op: "updateTest";
          id: string;
          fields: {
            title?: string;
            procedure?: string;
            expected?: string;
            status?: "not-run";
          };
        }
      | {
          op: "updateDocument";
          markdown: string;
        }
    )[]
  ];
}
export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: "draft" | "approved" | "deprecated";
  constraints: string[];
  /**
   * @minItems 1
   */
  acceptanceCriteria: [string, ...string[]];
  experienceIds: string[];
  testIds: string[];
}
export interface Experience {
  id: string;
  title: string;
  description: string;
  requirementIds: string[];
  state: {
    [k: string]: string | number | boolean | null;
  };
  components: Component[];
  events: Event[];
}
export interface Component {
  id: string;
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
  componentId: string;
  event: "click" | "change" | "hoverStart" | "hoverEnd";
  actions: (
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
      }
  )[];
}
export interface Test {
  id: string;
  requirementId: string;
  title: string;
  procedure: string;
  expected: string;
  status: "not-run" | "passed-local-scenario" | "failed-local-scenario" | "external-verified";
}

export type Proposal = PSWChangeProposalDraftV01;
