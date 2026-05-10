import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(__dirname, '../bin/md-to-html.mjs');

test('CLI: no arguments', () => {
  // Requirement: The tool should show usage information and exit gracefully when no arguments are provided.
  // Case: boundary
  // Invariant: Exit code should be 1, and stderr should contain usage info.
  
  try {
    execSync(`node ${binPath}`, { stdio: 'pipe' });
    assert.fail('Should have failed');
  } catch (error) {
    assert.strictEqual(error.status, 1);
    const stderr = error.stderr.toString();
    assert.match(stderr, /Usage:/);
    assert.match(stderr, /md-to-html <input> \[output\]/);
    assert.match(stderr, /Arguments:/);
    assert.match(stderr, /Options:/);
  }
});

test('CLI: --help', () => {
  // Requirement: The tool should show help information when --help is provided.
  // Case: happy-path
  // Invariant: Exit code should be 0, and stdout should contain usage info.
  
  const stdout = execSync(`node ${binPath} --help`, { stdio: 'pipe' }).toString();
  assert.match(stdout, /Usage:/);
  assert.match(stdout, /md-to-html <input> \[output\]/);
});

test('CLI: --version', () => {
  // Requirement: The tool should show version information.
  // Case: happy-path
  // Invariant: Exit code should be 0, and stdout should contain version.
  
  const stdout = execSync(`node ${binPath} --version`, { stdio: 'pipe' }).toString();
  assert.match(stdout, /md-to-html v\d+\.\d+\.\d+/);
});

test('CLI: missing input path', () => {
  // Requirement: The tool should show error when input path is missing (or starts with -).
  // Case: error
  // Invariant: Exit code should be 1.
  
  try {
    execSync(`node ${binPath} --title "Foo"`, { stdio: 'pipe' });
    assert.fail('Should have failed');
  } catch (error) {
    assert.strictEqual(error.status, 1);
    assert.match(error.stderr.toString(), /Error: Missing input path/);
  }
});

test('CLI: happy path', () => {
  // Requirement: The tool should bundle markdown to HTML.
  // Case: happy-path
  // Invariant: HTML file should be created with correct content.
  
  const inputPath = path.join(__dirname, 'fixtures/simple.md');
  const outputPath = path.join(__dirname, 'output.html');
  
  if (!fs.existsSync(path.join(__dirname, 'fixtures'))) {
    fs.mkdirSync(path.join(__dirname, 'fixtures'));
  }
  fs.writeFileSync(inputPath, '# Hello 🌍', 'utf8');
  
  try {
    // With explicit title
    execSync(`node ${binPath} "${inputPath}" "${outputPath}" --title "My 💎 Doc"`, { stdio: 'pipe' });
    let html = fs.readFileSync(outputPath, 'utf8');
    assert.match(html, /<h1>Hello 🌍<\/h1>/);
    assert.match(html, /<title>My 💎 Doc<\/title>/);

    // With default title (extracted from # heading)
    execSync(`node ${binPath} "${inputPath}" "${outputPath}"`, { stdio: 'pipe' });
    html = fs.readFileSync(outputPath, 'utf8');
    assert.match(html, /<title>Hello 🌍<\/title>/);

    // With no heading (extracted from first line)
    fs.writeFileSync(inputPath, 'Just some text', 'utf8');
    execSync(`node ${binPath} "${inputPath}" "${outputPath}"`, { stdio: 'pipe' });
    html = fs.readFileSync(outputPath, 'utf8');
    assert.match(html, /<title>Just some text<\/title>/);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
});

test('CLI: optional output path', () => {
  // Requirement: Use input path with .html extension if output path is not provided.
  // Case: happy-path
  // Invariant: .html file is created in the same directory.
  
  const inputPath = path.join(__dirname, 'test-doc.md');
  const expectedOutputPath = path.join(__dirname, 'test-doc.html');
  
  fs.writeFileSync(inputPath, '# Test Doc');
  
  try {
    execSync(`node ${binPath} "${inputPath}"`, { stdio: 'pipe' });
    assert.ok(fs.existsSync(expectedOutputPath));
    const html = fs.readFileSync(expectedOutputPath, 'utf8');
    assert.match(html, /<h1>Test Doc<\/h1>/);
    assert.match(html, /<title>Test Doc<\/title>/);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(expectedOutputPath)) fs.unlinkSync(expectedOutputPath);
  }
});

test('CLI: derive output path when second arg is an option', () => {
  // Requirement: Derive output path from input if second arg starts with --.
  // Case: happy-path
  // Invariant: .html file is created even if --title is the second arg.
  
  const inputPath = path.join(__dirname, 'option-as-second.md');
  const expectedOutputPath = path.join(__dirname, 'option-as-second.html');
  
  fs.writeFileSync(inputPath, '# Option Second');
  
  try {
    execSync(`node ${binPath} "${inputPath}" --title "Specific Title"`, { stdio: 'pipe' });
    assert.ok(fs.existsSync(expectedOutputPath));
    const html = fs.readFileSync(expectedOutputPath, 'utf8');
    assert.match(html, /<title>Specific Title<\/title>/);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(expectedOutputPath)) fs.unlinkSync(expectedOutputPath);
  }
});

test('CLI: automatic title from # heading', () => {
  // Requirement: Extract title from first # heading if not provided.
  // Case: happy-path
  // Invariant: <title> matches first # heading.
  
  const inputPath = path.join(__dirname, 'heading-title.md');
  const outputPath = path.join(__dirname, 'heading-title.html');
  
  fs.writeFileSync(inputPath, 'Some preamble\n\n# The Real Title\n\nContent');
  
  try {
    execSync(`node ${binPath} "${inputPath}" "${outputPath}"`, { stdio: 'pipe' });
    const html = fs.readFileSync(outputPath, 'utf8');
    assert.match(html, /<title>The Real Title<\/title>/);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
});

test('CLI: automatic title from first line', () => {
  // Requirement: Extract title from first line if no # heading exists.
  // Case: happy-path
  // Invariant: <title> matches first non-empty line.
  
  const inputPath = path.join(__dirname, 'first-line-title.md');
  const outputPath = path.join(__dirname, 'first-line-title.html');
  
  fs.writeFileSync(inputPath, '\n\nFirst Line Title\n\nContent');
  
  try {
    execSync(`node ${binPath} "${inputPath}" "${outputPath}"`, { stdio: 'pipe' });
    const html = fs.readFileSync(outputPath, 'utf8');
    assert.match(html, /<title>First Line Title<\/title>/);
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
});

test('CLI: file not found', () => {
  // Requirement: The tool should handle non-existent files gracefully.
  // Case: error
  // Invariant: Exit code should be 1.
  
  try {
    execSync(`node ${binPath} non-existent.md output.html`, { stdio: 'pipe' });
    assert.fail('Should have failed');
  } catch (error) {
    assert.strictEqual(error.status, 1);
    assert.match(error.stderr.toString(), /Error: ENOENT/);
  }
});
