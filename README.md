# akshatbhaskar.ninja

My personal site. It's where I keep the things I've actually worked on (research, NGO, financial literacy initiatives, advanced mathematics) along with a few side pages I built because I wanted them to exist: a chess timer, a budget tool, a gym plan, a Kashmir/Ladakh trip itinerary.

I wrote it by hand. No framework, nothing to install. Just HTML, CSS, and a bit of vanilla JavaScript on the pages that needed it. The whole thing is meant to read like an academic paper, abstract and footnotes and all, because I figured a portfolio that looks like a journal article would stick in your head longer than yet another card grid.

## Running it

There's nothing to build. Open `index.html` in a browser and it just works. If you want the links between pages to behave properly, serve the folder with any static server:

```
python -m http.server
```

Then open `http://localhost:8000`.

## How it's put together

- One HTML file per page. Most of the styling lives in each page's own `<style>` block, so a page is basically self-contained. `style.css` has the shared bits.
- Fonts are EB Garamond and Inconsolata, pulled from Google Fonts.
- Font Awesome for the social icons.
- The contact form on the homepage posts to Formspree.
- It's hosted on GitHub Pages with a custom domain (that's what `CNAME` is for).

## The pages

`index.html` is the front door. From there you can reach education, experience, awards, research, the AI policy paper, and write-ups for the individual projects. Everything else is smaller stuff I made for fun.

## Contact

akshatbhaskar.ninja, or just email me at bhaskarakshat22@gmail.com.
