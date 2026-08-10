import { describe, expect, it } from "vitest";
import {
  clearLogicalInput,
  createLogicalInput,
  isControlHeld,
  releaseControl,
  setControlHeld,
} from "./input";

describe("logical input", () => {
  it("represents held and released intent without physical key codes", () => {
    const empty = createLogicalInput();
    const held = setControlHeld(empty, "angler:1", true);

    expect(isControlHeld(empty, "angler:1")).toBe(false);
    expect(isControlHeld(held, "angler:1")).toBe(true);

    const released = releaseControl(held, "angler:1");
    expect(isControlHeld(released, "angler:1")).toBe(false);
  });

  it("clears every held intent when an input source is interrupted", () => {
    let input = createLogicalInput();
    input = setControlHeld(input, "axis:x", true);
    input = setControlHeld(input, "axis:y", true);

    const cleared = clearLogicalInput(input);

    expect(isControlHeld(cleared, "axis:x")).toBe(false);
    expect(isControlHeld(cleared, "axis:y")).toBe(false);
  });
});
