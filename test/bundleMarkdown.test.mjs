import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { bundleMarkdownDocument } from '../src/bundleMarkdown.mjs';

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe('markdown document bundling', () => {
  it('wraps a markdown document in themed, semantic HTML', () => {
    // Requirement: Convert a useful markdown document into a complete themed HTML page.
    // Case: happy-path
    // Invariant: The generated page contains semantic content and the default theme.
    // Arrange
    const markdown = '# Project Notes\n\nWelcome to **pretty** docs.\n\n- Fast\n- Simple';

    // Act
    const html = bundleMarkdownDocument({ markdown, title: 'Project Notes' });

    // Assert
    assert.match(html, /<!doctype html>/);
    assert.match(html, /<title>Project Notes<\/title>/);
    assert.match(html, /<h1>Project Notes<\/h1>/);
    assert.match(html, /<button id="theme-toggle"/);
    assert.match(html, /<script>/);
  });

  it('escapes raw HTML and preserves inline code literally', () => {
    // Requirement: User-provided markdown must not inject HTML into the generated page.
    // Case: error
    // Invariant: Raw HTML is escaped while markdown code formatting remains readable.
    // Arrange
    const markdown = '# Safe\n\n<script>alert("x")</script> and `const ok = true`';

    // Act
    const html = bundleMarkdownDocument({ markdown, title: '<Unsafe>' });

    // Assert
    assert.match(html, /<title>&lt;Unsafe&gt;<\/title>/);
    assert.match(html, /<p>&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; and <code>const ok = true<\/code><\/p>/);
    assert.doesNotMatch(html, /<script>alert/);
  });

  it('renders an empty markdown document as an empty themed article', () => {
    // Requirement: Empty markdown documents should still produce a valid, themed page shell.
    // Case: boundary
    // Invariant: The page remains complete without inventing content.
    // Arrange
    const markdown = '   \n\n  ';

    // Act
    const html = bundleMarkdownDocument({ markdown, title: 'Empty' });

    // Assert
    assert.match(html, /<title>Empty<\/title>/);
    assert.match(html, /<main class="markdown-body">\n\n<\/main>/);
    assert.match(html, /font-family:Inter/);
  });

  it('bundles a markdown file from any working directory', async (t) => {
    // Requirement: Docs authors can run the bundler without being inside the project directory.
    // Case: happy-path
    // Invariant: The output file is a complete themed HTML document at the requested path.
    // Arrange
    const workspace = await mkdtemp(join(tmpdir(), 'md-to-html-'));
    const inputPath = join(workspace, 'guide.md');
    const outputPath = join(workspace, 'guide.html');
    const binPath = join(repoRoot, 'bin', 'md-to-html.mjs');
    t.after(async () => rm(workspace, { recursive: true, force: true }));
    await writeFile(inputPath, '# CLI Guide\n\nShip `docs` quickly.', 'utf8');

    // Act
    await execFileAsync(binPath, [inputPath, outputPath, '--title', 'CLI Guide'], {
      cwd: tmpdir(),
    });
    const html = await readFile(outputPath, 'utf8');

    // Assert
    assert.match(html, /<!doctype html>/);
    assert.match(html, /<h1>CLI Guide<\/h1>/);
    assert.match(html, /Ship <code>docs<\/code> quickly\./);
    assert.match(html, /class="markdown-body"/);
  });

  it('renders a realistic markdown guide with common documentation elements', async () => {
    // Requirement: Real markdown docs should render common guide elements as semantic HTML.
    // Case: happy-path
    // Invariant: Headings, quotes, links, code, and lists remain readable in the themed document.
    // Arrange
    const fixturePath = join(repoRoot, 'test', 'fixtures', 'getting-started.md');
    const markdown = await readFile(fixturePath, 'utf8');

    // Act
    const html = bundleMarkdownDocument({ markdown, title: 'Getting Started' });

    // Assert
    assert.match(html, /<h1>Getting Started<\/h1>/);
    assert.match(html, /<h2>Install<\/h2>/);
    assert.match(html, /It keeps docs small &amp; friendly\.<\/p>/);
    assert.match(html, /<blockquote>Keep source docs readable and generated docs polished\.<\/blockquote>/);
    assert.match(html, /Run <code>npm link<\/code> from the repository/);
    assert.match(html, /<li>Bundle HTML<\/li>/);
    assert.match(html, /<p>Read the <a href="https:\/\/example\.com\/docs">project guide<\/a> or <a href="http:\/\/example\.test\/docs">local mirror<\/a> for more examples\.<\/p>/);
    assert.doesNotMatch(html, /<li><\/li>/);
  });

  it('separates adjacent block types without requiring blank lines', () => {
    // Requirement: Markdown block markers at the start of a line should begin new semantic blocks.
    // Case: boundary
    // Invariant: Adjacent headings, lists, quotes, and paragraphs do not merge together.
    // Arrange
    const markdown = 'Intro line\n# Next Topic\n## Details\n- First action\n> Important note';

    // Act
    const html = bundleMarkdownDocument({ markdown, title: 'Adjacent Blocks' });

    // Assert
    assert.match(html, /<p>Intro line<\/p>\n<h1>Next Topic<\/h1>/);
    assert.match(html, /<h2>Details<\/h2>\n<ul>\n<li>First action<\/li>\n<\/ul>/);
    assert.match(html, /<\/ul>\n<blockquote>Important note<\/blockquote>/);
  });

  it('ignores whitespace-only separators between paragraphs', () => {
    // Requirement: Whitespace-only lines should act like blank markdown separators.
    // Case: boundary
    // Invariant: Paragraphs separated by spaces stay distinct without empty paragraph output.
    // Arrange
    const markdown = 'First wrapped\nparagraph\n   \nSecond paragraph';

    // Act
    const html = bundleMarkdownDocument({ markdown, title: 'Whitespace Separators' });

    // Assert
    assert.match(html, /<p>First wrapped paragraph<\/p>\n<p>Second paragraph<\/p>/);
    assert.doesNotMatch(html, /<p>\s*<\/p>/);
  });

  it('ends paragraphs before directly adjacent secondary blocks', () => {
    // Requirement: Paragraph text should not absorb following markdown block markers.
    // Case: boundary
    // Invariant: H2 headings, lists, and quotes remain separate when no blank line precedes them.
    // Arrange
    const markdown = 'Before h2\n## Details\nBefore list\n- Action\nBefore quote\n> Note';

    // Act
    const html = bundleMarkdownDocument({ markdown, title: 'Secondary Blocks' });

    // Assert
    assert.match(html, /<p>Before h2<\/p>\n<h2>Details<\/h2>/);
    assert.match(html, /<p>Before list<\/p>\n<ul>\n<li>Action<\/li>\n<\/ul>/);
    assert.match(html, /<p>Before quote<\/p>\n<blockquote>Note<\/blockquote>/);
  });

  it('includes a dark mode theme variant', () => {
    // Requirement: The generated HTML should include a dark mode theme variant for system dark mode users.
    // Case: happy-path
    // Invariant: CSS contains @media (prefers-color-scheme: dark).
    
    // Act
    const html = bundleMarkdownDocument({ markdown: '# Hello', title: 'Dark Mode' });
    
    // Assert
    assert.match(html, /@media\s*\(prefers-color-scheme:\s*dark\)/);
    assert.match(html, /\.dark/);
  });

  it('includes a theme toggle button and persistence script', () => {
    // Requirement: The generated HTML should include a button to toggle between light and dark modes manually.
    // Case: happy-path
    // Invariant: HTML contains a toggle button and a script for theme management.
    
    // Act
    const html = bundleMarkdownDocument({ markdown: '# Hello', title: 'Toggle Test' });
    
    // Assert
    assert.match(html, /<button[^>]*id="theme-toggle"/);
    assert.match(html, /localStorage\.getItem\(storageKey\)/);
    assert.match(html, /\.classList\.add\(theme\)/);
  });
});