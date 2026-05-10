# md-to-html

A tiny markdown-to-HTML bundler for making simple markdown docs look prettier with a built-in CSS theme.

## Setup

Use Node.js 18.17 or newer. From this repository, link the CLI if you want to run it from any directory:

```sh
npm link
```

## Usage

```sh
md-to-html ./docs/guide.md ./public/guide.html --title "Guide"
```

The generated HTML is self-contained: semantic HTML plus an embedded light docs theme.

## Development

```sh
npm test
npm run mutation
```

Mutation testing runs through Stryker Mutator using `npx` and must stay at `100%`.