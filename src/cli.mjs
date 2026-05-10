import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { bundleMarkdownDocument } from './bundleMarkdown.mjs';

const HELP_TEXT = `\nUsage: md-to-html <input> [output] [options]

Arguments:
  input         Path to the markdown file
  output        Path to the output HTML file (default: input with .html extension)

Options:
  --title <t>   Title of the document (default: first # heading or first line)
  --version     Show version information
  --help        Show this help message
`;

const VERSION = '0.1.0';

const extractTitle = (markdown) => {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const heading = lines.find((line) => line.startsWith('# '));
  if (heading) {
    return heading.slice(2);
  }
  return lines.find((line) => line !== '') || 'Markdown Document';
};

export const runCli = async (args) => {
  if (args.includes('--help')) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  if (args.length === 0) {
    process.stderr.write(HELP_TEXT);
    process.exit(1);
  }

  if (args.includes('--version')) {
    process.stdout.write(`md-to-html v${VERSION}\n`);
    process.exit(0);
  }

  const [inputPath, secondArg, ...rest] = args;

  if (!inputPath || inputPath.startsWith('-')) {
    process.stderr.write('Error: Missing input path\n\n');
    process.stderr.write(HELP_TEXT);
    process.exit(1);
  }

  let outputPath = secondArg;
  let titleOptions = rest;

  if (secondArg && secondArg.startsWith('--')) {
    outputPath = undefined;
    titleOptions = [secondArg, ...rest];
  }

  if (!outputPath) {
    outputPath = join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.html`);
  }

  const titleIndex = titleOptions.indexOf('--title');
  let title = titleIndex !== -1 ? titleOptions[titleIndex + 1] : undefined;

  try {
    const markdown = await readFile(inputPath, 'utf8');
    if (title === undefined) {
      title = extractTitle(markdown);
    }
    const html = bundleMarkdownDocument({ markdown, title });
    await writeFile(outputPath, html, 'utf8');
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }
};
