import fs from 'fs/promises';
import path from 'path';
import { WorkflowConfig } from '../config/schema.js';
import { detectAdapter, getAdapter } from '../adapters/index.js';

export interface TemplateContext {
  projectName: string;
  framework: string;
  scopes: string;
  scopeList: string;
  pathStructure: string;
  enforcement: string;
  year: string;
  [key: string]: string;
}

/**
 * Renders a template string with provided context using simple {{variable}} syntax
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] ?? match;
  });
}

/**
 * Builds template context from workflow config and detected framework
 */
export async function buildTemplateContext(
  config: WorkflowConfig,
  projectPath: string = process.cwd()
): Promise<TemplateContext> {
  // Detect framework
  const detectedFramework = await detectAdapter();
  const adapter = getAdapter(detectedFramework);

  // Build scope list as markdown
  const scopeList = config.scopes
    .map(s => `- **${s.name}** - ${s.description}`)
    .join('\n');

  // Build scope names list (comma-separated)
  const scopes = config.scopes.map(s => s.name).join(', ');

  // Build path structure from adapter
  const pathStructure = `
### Path Structure

\`\`\`
${adapter.paths.components}/    → UI components
${adapter.paths.lib}/          → Utility functions and services
${adapter.paths.hooks}/        → Custom React hooks
${adapter.paths.types}/        → TypeScript type definitions
\`\`\`
`.trim();

  // Get project name from package.json or directory name
  const projectName = await getProjectName(projectPath);

  return {
    projectName,
    framework: adapter.name,
    scopes,
    scopeList,
    pathStructure,
    enforcement: config.enforcement.level,
    year: new Date().getFullYear().toString(),
  };
}

/**
 * Renders a template file and writes output
 */
export async function renderTemplateFile(
  templatePath: string,
  outputPath: string,
  context: TemplateContext
): Promise<void> {
  const template = await fs.readFile(templatePath, 'utf-8');
  const rendered = renderTemplate(template, context);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, rendered, 'utf-8');
}

/**
 * Renders all template files from source directory to output directory
 */
export async function renderTemplateDirectory(
  templateDir: string,
  outputDir: string,
  context: TemplateContext
): Promise<string[]> {
  const files = await fs.readdir(templateDir);
  const rendered: string[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const templatePath = path.join(templateDir, file);
    const outputPath = path.join(outputDir, file);

    await renderTemplateFile(templatePath, outputPath, context);
    rendered.push(file);
  }

  return rendered;
}

/**
 * Gets project name from package.json or directory name
 */
async function getProjectName(projectPath: string): Promise<string> {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    return pkg.name || path.basename(projectPath);
  } catch {
    return path.basename(projectPath);
  }
}

/**
 * Validates that template directory exists and contains markdown files
 */
export async function validateTemplateDirectory(templateDir: string): Promise<void> {
  try {
    const stat = await fs.stat(templateDir);
    if (!stat.isDirectory()) {
      throw new Error(`Template path is not a directory: ${templateDir}`);
    }

    const files = await fs.readdir(templateDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      throw new Error(`No markdown files found in template directory: ${templateDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Template directory not found: ${templateDir}`);
    }
    throw error;
  }
}
