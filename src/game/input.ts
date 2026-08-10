export type LogicalControlId =
  | `angler:${number}`
  | `axis:${"x" | "y"}`;

export const playerControlId = (playerId: number): LogicalControlId =>
  `angler:${playerId}`;

export const axisControlId = (axis: "x" | "y"): LogicalControlId =>
  `axis:${axis}`;

export interface LogicalInput {
  readonly heldControls: ReadonlySet<LogicalControlId>;
}

export const createLogicalInput = (
  heldControls: Iterable<LogicalControlId> = [],
): LogicalInput => ({ heldControls: new Set(heldControls) });

export const isControlHeld = (
  input: LogicalInput,
  controlId: LogicalControlId,
) => input.heldControls.has(controlId);

export const setControlHeld = (
  input: LogicalInput,
  controlId: LogicalControlId,
  held: boolean,
): LogicalInput => {
  if (isControlHeld(input, controlId) === held) {
    return input;
  }

  const heldControls = new Set(input.heldControls);
  if (held) {
    heldControls.add(controlId);
  } else {
    heldControls.delete(controlId);
  }
  return { heldControls };
};

export const releaseControl = (
  input: LogicalInput,
  controlId: LogicalControlId,
) => setControlHeld(input, controlId, false);

export const clearLogicalInput = (input: LogicalInput): LogicalInput =>
  input.heldControls.size === 0 ? input : createLogicalInput();
