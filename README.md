# hakhyun-kim.github.io

Personal portfolio & blog of Hakhyun Kim — software engineer (games, engines, XR, DevRel).

Built with [Astro](https://astro.build), deployed to GitHub Pages via GitHub Actions.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

## Content

- `src/content/blog/` — blog posts (markdown). 61 posts migrated from shuaiharry.blogspot.com
  with `npm run import:blogger <feed.xml>` (see `scripts/import-blogger.mjs`).
- `public/blog-images/` — images downloaded from the old blog.
- `src/pages/index.astro` — portfolio home (experience / projects / contact).
