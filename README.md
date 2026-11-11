# fernandoadms.dev

[![license](https://img.shields.io/github/license/fernandoadms/fernandoadms.dev.svg)](./LICENSE)

> My personal website and blog: front-end, architecture and software engineering.
>
> Based on [felipefialho.com](https://github.com/felipefialho/felipefialho.com) by Felipe Fialho (MIT).

**[fernandoadms.dev](https://fernandoadms.dev)**

Posts are written in Portuguese, with some translated to English under `/en/`. The site is static, fast and mostly plain HTML and CSS.

## Stack

- [Astro](https://astro.build/) 7 with TypeScript and plain CSS
- Markdown processed by Sätteri, with local plugins in `src/plugins` (embeds, image attributes, external links, heading anchors, reading time, in-article ads)
- [Pagefind](https://pagefind.app/) for search
- Build-time Open Graph cards with satori and sharp
- LGPD consent banner with Consent Mode v2: Google Analytics 4 loads only after consent, and only when `PUBLIC_GA_ID` is set
- [Netlify](https://www.netlify.com/) for hosting, with the Image CDN serving legacy post images

## Getting Started

Requires the Node.js version in `.nvmrc` and [pnpm](https://pnpm.io/).

```sh
# install dependencies
$ pnpm install

# Run the project
$ pnpm dev
```

### Tasks

- `pnpm dev`: start the dev server
- `pnpm build`: type-check, build to `dist` and index the site for search
- `pnpm preview`: serve the production build locally
- `pnpm lint`: lint scripts and styles
- `pnpm lint:fix`: fix lint errors automatically

Search only works after a build, because Pagefind indexes the generated `dist`. Run `pnpm build && pnpm preview` to try it.

## Commits, versions and releases

- Commits follow [Conventional Commits](https://www.conventionalcommits.org). A `commit-msg` hook (husky + commitlint) checks every message locally, and CI checks the commits of each pull request
- Versions follow [Semantic Versioning](https://semver.org), computed by [semantic-release](https://semantic-release.gitbook.io) from the commits since the last tag: `fix:` bumps the patch, `feat:` the minor, and `feat!:` or a `BREAKING CHANGE:` footer the major. `docs:`, `chore:`, `ci:`, `test:`, `refactor:` and `style:` do not release
- Each release tags `vX.Y.Z`, updates `CHANGELOG.md` and the `package.json` version, and publishes a GitHub release

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. **Conventional Commits** (pull requests only): commitlint over the PR commits
2. **build-and-e2e**: type-check, lint, unit tests, build and Playwright e2e
3. **Release** (push to `main`): semantic-release
4. **Deploy** (push to `main`): ships the tested `dist` to Netlify production

Deploy needs two repository secrets: `NETLIFY_AUTH_TOKEN` (Netlify personal access token) and `NETLIFY_SITE_ID` (Project configuration → Project ID). Analytics reads the optional `PUBLIC_GA_ID` repository variable. Netlify's own Git builds should stay off, so only CI deploys.

## Writing a post

Create a file at `content/posts/YYYY-MM-DD-slug.md`, or a folder at `content/posts/YYYY-MM-DD-slug/index.md` to keep images next to the post. The URL drops the date prefix, so both become `/blog/slug/`.

```md
---
title: Post title
date: 2026-10-01
description: One sentence used in listings and meta tags.
tags: [css, front-end]
draft: false
---
```

- `tags` and `draft` are optional, `draft` defaults to `false`
- English translations go in `content/posts-en/` with the same frontmatter plus `translationOf: <pt-slug>`

## Fonts

Mona Sans is the only typeface, subset to Latin with its variable axes pinned. To regenerate `src/assets/fonts`, run `scripts/subset-fonts.sh`. It needs `fonttools` and `brotli` (`pip install fonttools brotli`).

## License

Source code: MIT, see [LICENSE](./LICENSE).

Posts, pages and their images in [`content/`](./content): © [Fernando Alves](https://www.linkedin.com/in/fernandoadms/), all rights reserved, see [content/LICENSE.md](./content/LICENSE.md).
