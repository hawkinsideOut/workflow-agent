import chalk from "chalk";

export async function configCommand(
  action: string,
  key?: string,
  value?: string,
) {
  console.log(chalk.yellow("Config command not yet implemented"));
  console.log({ action, key, value });
}
