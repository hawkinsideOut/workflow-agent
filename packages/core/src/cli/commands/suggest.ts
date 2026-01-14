import chalk from 'chalk';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function suggestCommand(feedback: string) {
  console.log(chalk.cyan('💡 Submitting improvement suggestion...\n'));

  const cwd = process.cwd();
  const improvementsDir = join(cwd, '.workflow', 'improvements');

  // Create improvements directory if it doesn't exist
  if (!existsSync(improvementsDir)) {
    await mkdir(improvementsDir, { recursive: true });
  }

  // Generate suggestion file
  const timestamp = new Date().toISOString().split('T')[0];
  const id = Date.now().toString(36);
  const filename = `${timestamp}-${id}.md`;
  const filepath = join(improvementsDir, filename);

  const content = `# Improvement Suggestion

**ID**: ${id}
**Date**: ${new Date().toISOString()}
**Status**: proposed
**Category**: _To be categorized_
**Priority**: _To be prioritized_

## Feedback

${feedback}

## Implementation Plan

_To be filled by maintainers_

---

*This suggestion will be reviewed and may be incorporated into future workflow-agent releases.*
`;

  await writeFile(filepath, content);

  console.log(chalk.green('✓ Suggestion submitted successfully!'));
  console.log(chalk.dim(`  Saved to: .workflow/improvements/${filename}`));
  console.log(chalk.dim('\nYour suggestion will be:'));
  console.log(chalk.dim('  1. Reviewed by the community'));
  console.log(chalk.dim('  2. Prioritized based on impact'));
  console.log(chalk.dim('  3. Integrated into future releases'));
}
