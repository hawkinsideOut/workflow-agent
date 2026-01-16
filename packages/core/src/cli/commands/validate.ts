import chalk from "chalk";
import { execa } from "execa";
import { loadConfig } from "../../config/index.js";
import {
  validateBranchName,
  validateCommitMessage,
  validatePRTitle,
} from "../../validators/index.js";

export async function validateCommand(
  type: string,
  value?: string,
  _options: { suggestOnError?: boolean } = {},
) {
  const config = await loadConfig();

  if (!config) {
    console.error(
      chalk.red("✗ No workflow configuration found. Run: workflow init"),
    );
    process.exit(1);
  }

  let targetValue = value;

  try {
    let result;
    switch (type) {
      case "branch": {
        if (!targetValue) {
          const { stdout } = await execa("git", ["branch", "--show-current"]);
          targetValue = stdout.trim();
        }
        result = await validateBranchName(targetValue, config);
        break;
      }

      case "commit": {
        if (!targetValue) {
          const { stdout } = await execa("git", ["log", "-1", "--pretty=%s"]);
          targetValue = stdout.trim();
        }
        result = await validateCommitMessage(targetValue, config);
        break;
      }

      case "pr":
      case "pr-title": {
        if (!targetValue) {
          console.error(chalk.red("✗ PR title must be provided as argument"));
          process.exit(1);
        }
        result = await validatePRTitle(targetValue, config);
        break;
      }

      default:
        console.error(chalk.red(`✗ Unknown validation type: ${type}`));
        console.error(chalk.dim("Valid types: branch, commit, pr"));
        process.exit(1);
    }

    if (result.valid) {
      console.log(chalk.green(`✓ ${type} is valid: ${targetValue}`));
      process.exit(0);
    } else {
      console.error(chalk.red(`✗ Invalid ${type}: ${targetValue}`));
      console.error(chalk.yellow(`  ${result.error}`));
      if (result.suggestion) {
        console.error(chalk.cyan(`  💡 ${result.suggestion}`));
      }

      const enforcementLevel = config.enforcement;
      if (enforcementLevel === "strict") {
        process.exit(1);
      } else {
        console.log(
          chalk.yellow(
            `\n⚠️  Advisory mode: validation failed but not blocking`,
          ),
        );
        process.exit(0);
      }
    }
  } catch (error) {
    console.error(chalk.red(`✗ Validation error: ${error}`));
    process.exit(1);
  }
}
