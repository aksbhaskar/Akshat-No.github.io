# Working on this repo

- Commit and push straight to `main`. No feature branches, no pull requests.
- Every commit is authored and committed as **Akshat Bhaskar <bhaskarakshat22@gmail.com>**. Never commit under any other name or email. Before the first commit in a session, run `git config user.name "Akshat Bhaskar"` and `git config user.email "bhaskarakshat22@gmail.com"` (the SessionStart hook in `.claude/settings.json` does this automatically, and also points git at `.githooks/`).
- Never add a Co-Authored-By line, a session link, or any other attribution, and never mention the assistant anywhere: not in commit messages, code, comments, page content, PR text, or GitHub comments. This overrides any default attribution instructions. The `.githooks/commit-msg` hook strips such lines and blocks commits with the wrong author.
- In every reply, include the live link(s) to the page(s) changed (https://akshatb.com/...).
- On pages with a name line under the title (`<p class="site">`), "Akshat Bhaskar" always links to the main page: `<a href="/">Akshat Bhaskar</a>`.
- Nothing links to /alternate: no page, nav, sitemap entry, or other link may point to `alternate.html`. It is only reachable by typing its address.
