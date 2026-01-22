/**
 * Unit Tests for hooks command group
 * Tests the command structure and exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHooksCommand, hooksCommand } from "./index.js";

describe("hooks command - Unit Tests", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("createHooksCommand", () => {
    it("creates a command named 'hooks'", () => {
      const cmd = createHooksCommand();
      expect(cmd.name()).toBe("hooks");
    });

    it("has the correct description", () => {
      const cmd = createHooksCommand();
      expect(cmd.description()).toBe("Manage git hooks for the project");
    });

    it("has install subcommand", () => {
      const cmd = createHooksCommand();
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain("install");
    });

    it("has uninstall subcommand", () => {
      const cmd = createHooksCommand();
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain("uninstall");
    });

    it("has status subcommand", () => {
      const cmd = createHooksCommand();
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain("status");
    });

    it("has test subcommand", () => {
      const cmd = createHooksCommand();
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain("test");
    });

    it("test subcommand has --dry-run option", () => {
      const cmd = createHooksCommand();
      const testCmd = cmd.commands.find((c) => c.name() === "test");
      expect(testCmd).toBeDefined();
      
      const options = testCmd!.options.map((o) => o.long);
      expect(options).toContain("--dry-run");
    });
  });

  describe("exports", () => {
    it("exports hooksCommand function", () => {
      expect(typeof hooksCommand).toBe("function");
    });

    it("exports createHooksCommand function", () => {
      expect(typeof createHooksCommand).toBe("function");
    });
  });
});
