import chalk from 'chalk';
import * as p from '@clack/prompts';
import { createTracker } from '@workflow/improvement-tracker';

export async function suggestCommand(feedback: string, options: { author?: string; category?: string } = {}) {
  console.log(chalk.cyan('💡 Submitting improvement suggestion...\n'));

  const tracker = createTracker();

  // Optionally get category if not provided
  let category = options.category;
  if (!category) {
    const categoryChoice = await p.select({
      message: 'What type of improvement is this?',
      options: [
        { value: 'feature', label: '✨ Feature Request' },
        { value: 'bug', label: '🐛 Bug Report' },
        { value: 'documentation', label: '📚 Documentation' },
        { value: 'performance', label: '⚡ Performance' },
        { value: 'other', label: '💡 Other' },
      ],
    });

    if (p.isCancel(categoryChoice)) {
      p.cancel('Suggestion cancelled');
      process.exit(0);
    }

    category = categoryChoice as string;
  }

  // Submit suggestion
  const result = await tracker.submit(feedback, options.author, category);

  if (!result.success) {
    console.log(chalk.red('✗ Suggestion rejected'));
    console.log(chalk.dim(`  Reason: ${result.error}`));
    process.exit(1);
  }

  console.log(chalk.green('✓ Suggestion submitted successfully!'));
  console.log(chalk.dim(`  ID: ${result.suggestion?.id}`));
  console.log(chalk.dim(`  Status: ${result.suggestion?.status}`));
  console.log(chalk.dim(`  Category: ${result.suggestion?.category}`));
  console.log(chalk.dim('\nYour suggestion will be:'));
  console.log(chalk.dim('  1. Reviewed by the community'));
  console.log(chalk.dim('  2. Prioritized based on impact'));
  console.log(chalk.dim('  3. Incorporated into future releases if approved\n'));
}
