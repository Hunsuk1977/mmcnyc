# mmcnyc.org — Mission & Media for Church

Static site. No build step, no dependencies. Every path is relative, so the same
files work at a domain root (`mmcnyc.org`) or under a subpath
(`hunsuk1977.github.io/mmcnyc/`) without changes.

## Where it's hosted

**GitHub Pages** (currently live): Settings → Pages → deploy from `main`, folder `/ (root)`.
Every push to `main` republishes within a minute or two. The `.nojekyll` file stops
GitHub from running the files through Jekyll.

**Netlify** (connected, paused): the project is linked to this repo and will deploy
on its own once the team's monthly credits reset. `netlify.toml` already sets the
publish directory, security headers, and cache rules — it is simply ignored by
GitHub Pages, so it is safe to leave in place.

## Editing

Edit a file on github.com (open it, click the pencil, commit) and the live site
updates on its own. No local setup needed.

Every bilingual piece of text is a pair of elements:

```html
<span class="en">Our vision</span><span class="ko">우리의 비전</span>
```

Edit both. English shows by default; Korean shows when `<html lang="ko">`, which the
header toggle sets and remembers. A `?lang=ko` link opens a page in Korean directly.

## Structure

```
index.html            Home
wordalive/            Wordalive product page
vision/               Vision & roadmap
about/                About MMC NYC
contact/              Contact
contact/thanks/       Unused today — the success page for Netlify Forms (see below)
404.html              Standalone; inlines its own styles because it is served at any depth
css/style.css         All styles
js/main.js            EN/KO toggle, mobile menu, nav highlight, contact form
img/mark.svg          Logo mark / favicon
.nojekyll             Required for GitHub Pages
netlify.toml          Headers + redirects, for when Netlify resumes
```

## Contact form

The form has no backend. On submit, `js/main.js` opens the visitor's email app with
the message prefilled and addressed to `hello@mmcnyc.org`, and the address is also
shown as a plain link for anyone whose browser has no mail app configured. This works
on any static host.

To switch to **Netlify Forms** after moving back to Netlify, replace the opening tag in
`contact/index.html` with:

```html
<form class="contact" name="contact" method="POST" data-netlify="true"
      netlify-honeypot="bot-field" action="thanks/">
  <input type="hidden" name="form-name" value="contact">
  <p class="hp"><label>Don't fill this out: <input name="bot-field"></label></p>
```

remove `id="contact-form"` so the JavaScript handler stops intercepting it, and set the
notification address under Site settings → Forms → Form notifications.

## Custom domain

Point `mmcnyc.org` at whichever host is serving the site, then set it under
Settings → Pages → Custom domain (GitHub) or Domain management (Netlify). Both issue a
free certificate. Serve from one host at a time.

## Colors and fonts

CSS variables at the top of `css/style.css` (`--accent`, `--bg`, `--ink`, …).
Fonts: Inter + Newsreader for Latin, Noto Sans KR + Noto Serif KR for Korean.
