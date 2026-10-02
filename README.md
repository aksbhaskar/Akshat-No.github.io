# akshatb.com

The personal website of **Akshat Bhaskar**: research on financial misinformation, financial literacy work with Edunomix and TaxCity, the Decoded podcast, mathematics, and updates on what I am up to.

**Live at [akshatb.com](https://akshatb.com)**

## About the site

Hand-written HTML, CSS, and a little vanilla JavaScript. No framework and no build step: every page is a plain HTML file you can open directly.

The design is meant to feel like a page from an old book: the pages sit on a card over *Alexander Cutting the Gordian Knot*, set in EB Garamond, with woodcut-style ornamental initials opening the first paragraph of each page.

A few small things to find:

- a desk at the bottom of the home page, where everything can be dragged around: a record player, a camera that opens the photography page, and a letter you can write to me
- a little pixel dog that naps in the corner of every page
- a second, more formal version of the site behind **better website?**

## Pages

| Page | What it is |
| --- | --- |
| [Home](https://akshatb.com) | who I am, what I run, and how to reach me |
| [Updates](https://akshatb.com/updates) | a running log of what I have been working on |
| [FOMO study](https://akshatb.com/fomo) | my research on who shares financial misinformation, at the Indian School of Business |
| [Gap year](https://akshatb.com/gapyear) | mathematics, teaching, research, and the podcast |
| [Awards](https://akshatb.com/awards) | honours and distinctions, 2022 to 2026 |
| [Timeline](https://akshatb.com/timeline) | everything, in dated order |
| [Photography](https://akshatb.com/photography) and [Corpus Delicti](https://akshatb.com/photos.html) | photographs, and the photographic record of the work |
| [Now](https://akshatb.com/now.html) | what has my attention at the moment |
| [Bookshelf](https://akshatb.com/bookshelf) | what I am reading |

## Repository layout

```
.
├── *.html          one file per page (index.html is the home page)
├── css/            bubbles.css (the shared minimal theme), theme.css
├── js/             desk.js (the home-page desk), dog.js (the dog), site.js
├── images/         photographs, covers, and illustrations
│   └── initials/   ornamental drop-cap initials
├── docs/           documents linked from the site
├── resume.pdf
├── sitemap.xml, robots.txt, humans.txt
└── CNAME           custom domain for GitHub Pages
```

## Running it locally

Nothing to install. Serve the folder with any static file server:

```bash
python -m http.server 8000
```

and open <http://localhost:8000>.

## Credits

- Ornamental initials from the [Alembic](https://alembic.space) editor's floral and wiggly sets, vectorised from books printed between 1510 and 1900.
- Type: [EB Garamond](https://fonts.google.com/specimen/EB+Garamond).
- Background: *Alexander Cutting the Gordian Knot*, Jean-Simon Berthélemy (public domain).
- Hosted on GitHub Pages.

## Contact

[bhaskarakshat22@gmail.com](mailto:bhaskarakshat22@gmail.com) &middot; [LinkedIn](https://www.linkedin.com/in/aksbhaskar/) &middot; [X](https://x.com/aksbhaskar) &middot; [GitHub](https://github.com/aksbhaskar)

&copy; 2026 Akshat Bhaskar. The writing and photographs on this site are mine; please ask before reusing them.
