export const DEFAULT_THEME = ':root{color-scheme:light dark;--page:#f8fafc;--panel:#ffffff;--text:#1f2937;--muted:#64748b;--accent:#2563eb;--border:#e2e8f0}.dark{--page:#0f172a;--panel:#1e293b;--text:#f1f5f9;--muted:#94a3b8;--accent:#38bdf8;--border:#334155}@media(prefers-color-scheme:dark){:root:not(.light){--page:#0f172a;--panel:#1e293b;--text:#f1f5f9;--muted:#94a3b8;--accent:#38bdf8;--border:#334155}}body{margin:0;background:var(--page);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.65}.markdown-body{max-width:760px;margin:48px auto;padding:40px;background:var(--panel);border:1px solid var(--border);border-radius:18px;box-shadow:0 20px 45px rgba(15,23,42,.08)}h1,h2,h3{line-height:1.2}h1{font-size:2.4rem;margin-top:0}a{color:var(--accent)}code{background:#e0f2fe;padding:.15rem .35rem;border-radius:6px}.dark code{background:#0c4a6e}@media(prefers-color-scheme:dark){:root:not(.light) code{background:#0c4a6e}}blockquote{border-left:4px solid var(--accent);margin-left:0;padding-left:1rem;color:var(--muted)}#theme-toggle{position:fixed;top:1.5rem;right:1.5rem;padding:.5rem;border-radius:50%;border:1px solid var(--border);background:var(--panel);color:var(--text);cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,.05)}#theme-toggle:hover{transform:scale(1.1)}';

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const renderInlineText = (value) =>
  value
    .split('`')
    .map((part, index) => {
      const escaped = escapeHtml(part);
      return index % 2 === 1
        ? `<code>${escaped}</code>`
        : escaped
            .replaceAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
            .replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    })
    .join('');

const renderParagraph = (lines) => `<p>${renderInlineText(lines.join(' '))}</p>`;

const renderList = (lines) => ['<ul>', ...lines.map((line) => `<li>${renderInlineText(line.slice(2))}</li>`), '</ul>'].join('\n');

const renderBlockquote = (lines) => `<blockquote>${renderInlineText(lines.map((line) => line.slice(2)).join(' '))}</blockquote>`;

const takeWhile = (lines, isIncluded) => {
  const endIndex = lines.findIndex((line) => !isIncluded(line));
  const splitIndex = endIndex === -1 ? lines.length : endIndex;
  return { block: lines.slice(0, splitIndex), rest: lines.slice(splitIndex) };
};

const joinBlock = (block, rest) => (rest === '' ? block : `${block}\n${rest}`);

const renderBlocks = ([line, ...rest]) => {
  if (line === undefined) {
    return '';
  }
  if (line.trim() === '') {
    return renderBlocks(rest);
  }
  if (line.startsWith('# ')) {
    return joinBlock(`<h1>${renderInlineText(line.slice(2))}</h1>`, renderBlocks(rest));
  }
  if (line.startsWith('## ')) {
    return joinBlock(`<h2>${renderInlineText(line.slice(3))}</h2>`, renderBlocks(rest));
  }
  if (line.startsWith('- ')) {
    const collected = takeWhile([line, ...rest], (item) => item.startsWith('- '));
    return joinBlock(renderList(collected.block), renderBlocks(collected.rest));
  }
  if (line.startsWith('> ')) {
    const collected = takeWhile([line, ...rest], (item) => item.startsWith('> '));
    return joinBlock(renderBlockquote(collected.block), renderBlocks(collected.rest));
  }
  const collected = takeWhile(
    [line, ...rest],
    (item) => item.trim() !== '' && !item.startsWith('# ') && !item.startsWith('## ') && !item.startsWith('- ') && !item.startsWith('> ')
  );
  return joinBlock(renderParagraph(collected.block), renderBlocks(collected.rest));
};

export const renderMarkdown = (markdown) => renderBlocks(markdown.split(/\r?\n/));

export const bundleMarkdownDocument = ({ markdown, title }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${DEFAULT_THEME}</style>
<script>
  const storageKey = 'theme';
  const getTheme = () => localStorage.getItem(storageKey) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const setTheme = (theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem(storageKey, theme);
  };
  document.addEventListener('DOMContentLoaded', () => {
    setTheme(getTheme());
    document.getElementById('theme-toggle').addEventListener('click', () => {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  });
</script>
</head>
<body>
<button id="theme-toggle" aria-label="Toggle theme">🌓</button>
<main class="markdown-body">
${renderMarkdown(markdown)}
</main>
</body>
</html>`;