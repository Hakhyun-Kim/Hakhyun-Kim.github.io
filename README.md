# hakhyun-kim.github.io

Personal portfolio & blog of Hakhyun Kim — software engineer (games, engines, XR, DevRel).

Built with [Astro](https://astro.build), deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # serve the built site
```

## Structure

- `src/components/Home.astro` — the whole site (projects / research / talks / blog / career /
  contact, in that order — the work leads, the career supports it). Content lives in plain
  arrays at the top of the file; every string carries an `en` and a `ko` variant.
- `src/pages/index.astro` (English) and `src/pages/ko/index.astro` (Korean) both render
  `Home.astro` with a `lang` prop — edit the arrays once and both pages update. The English
  page auto-redirects Korean browsers to `/ko/`; the header toggle overrides it.
- `src/pages/blog/` — blog index and post pages.
- `src/layouts/Base.astro` — shared head, header, footer.

## Content

- `src/content/blog/` — 61 blog posts (markdown) migrated from shuaiharry.blogspot.com with
  `npm run import:blogger <feed.xml>` (see `scripts/import-blogger.mjs`).
- `public/blog-images/` — images downloaded from the old blog.
- `public/slides/` — self-hosted PDFs of the SlideShare decks listed in Talks & Teaching
  (`scripts/fetch-slideshare.mjs`).
- `public/projects/` — project card images (screenshots, or hand-written SVG for projects
  with no UI to screenshot).

## Notes

- Root-level PDFs and `.docx` files are gitignored — resumes and source decks stay local.
  Anything meant for the site goes under `public/`.
