/**
 * Docs Advisory Subcommand
 *
 * Re-exports advisoryCommand from the parent directory.
 * This allows the command to be used as: workflow docs advisory
 */

export { advisoryCommand as docsAdvisoryCommand, type AdvisoryOptions as DocsAdvisoryOptions } from "../advisory.js";
