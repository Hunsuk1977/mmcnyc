# mmcnyc.org — Mission & Media for Church

Static site, no build step. Deploy the folder as-is to Netlify.

## Deploy

**Drag & drop:** netlify.com → Sites → drag this folder onto the page.

**Git:** push this folder to a repo, connect it in Netlify. Build command: *(none)*, publish directory: `.` (already set in `netlify.toml`).

Then add the custom domain `mmcnyc.org` under Site settings → Domain management.

## Structure

```
index.html            Home
wordalive/index.html  Wordalive product page
vision/index.html     Vision & roadmap
about/index.html      About MMC NYC
contact/index.html    Contact (Netlify Forms enabled)
contact/thanks/       Form success page
404.html
css/style.css         All styles
js/main.js            EN/KO toggle, mobile menu, nav highlight
img/mark.svg          Logo mark / favicon
netlify.toml          Headers + redirects
```

## Editing text

Every bilingual piece of text is a pair of elements:

```html
<span class="en">Our vision</span><span class="ko">우리의 비전</span>
```

Edit both. English is shown by default; Korean shows when `<html lang="ko">`
(the toggle in the header sets this and remembers the choice). A link with
`?lang=ko` opens a page in Korean directly.

## Contact form

`data-netlify="true"` is set on the form, so Netlify collects submissions
automatically. To receive them by email: Site settings → Forms → Form
notifications → add `hello@mmcnyc.org`.

## Colors / fonts

Change the CSS variables at the top of `css/style.css` (`--accent`, `--bg`, etc.).
Fonts: Inter + Newsreader (Latin), Noto Sans KR + Noto Serif KR (Korean), loaded from Google Fonts.
