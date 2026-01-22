import { Command } from "commander";
import { setupCommand } from "../setup.js";
import { autoSetupCommand } from "../auto-setup-command.js";

/**
 * Create the setup command group
 * Handles: setup, setup scripts, setup auto
 */
export function createSetupCommand(): Command {
  const setupCmd = new Command("setup")
    .description("Setup and configuration commands");

  // Default action - add workflow scripts
  setupCmd.action(setupCommand);

  // setup scripts - same as default
  setupCmd
    .command("scripts")
    .description("Add workflow scripts to package.json")
    .action(setupCommand);

  // setup auto - auto-configure linting, formatting, testing, and CI
  setupCmd
    .command("auto")
    .description("Automatically configure linting, formatting, testing, and CI")
    .option("-y, --yes", "Auto-approve all prompts")
    .option("--audit", "Show audit report without applying changes")
    .action(autoSetupCommand);

  return setupCmd;
}

// Export individual commands for direct access
export { setupCommand, autoSetupCommand };
