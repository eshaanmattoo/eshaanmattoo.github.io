# Professional Journey Technical Blog

A self-contained GitHub Pages website for a modern professional journey, technical blog, project portfolio, experience archive, roadmap, and contact page.

## What is included

- `index.html` for the home page.
- `roadmap.html` for a sleek growth roadmap.
- `experience.html`, `projects.html`, `blog.html`, and `contact.html`.
- `post.html` for reading Markdown blog posts.
- `content/` for editable site copy, roadmap data, experience entries, project cards, and posts.
- `assets/css/styles.css` for styling and theme tokens.
- `assets/images/` for local PNG visuals.
- `.github/workflows/pages.yml` for deploying the folder as its own GitHub Pages repository.

## Edit Your Details

Start with these files:

- `content/site.json`: name, role, email, navigation, social links, homepage copy, principles, and contact text.
- `content/roadmap.json`: roadmap milestones.
- `content/experience.json`: experience entries.
- `content/projects.json`: project cards and links.
- `content/posts/index.json`: blog post metadata.
- `content/posts/*.txt`: blog post content served by GitHub Pages.
- `content/posts/*.md`: editable Markdown copies kept for local authoring/reference.

## Add A New Blog Post

1. Create a post body file in `content/posts/`, for example `content/posts/my-new-post.txt`.
2. Add the post metadata to `content/posts/index.json`.
3. Use the slug without `.txt` in the metadata and add a `source` path:

```json
{
  "slug": "my-new-post",
  "title": "My New Post",
  "date": "2026-07-08",
  "readingTime": "3 min read",
  "category": "Engineering Notes",
  "source": "content/posts/my-new-post.txt",
  "excerpt": "A short summary for the blog page.",
  "tags": ["Robotics", "Learning"],
  "image": "assets/images/post-growth-roadmap.png",
  "imageAlt": "Post cover image"
}
```

## Preview Locally

Because the site loads JSON and Markdown with `fetch`, preview it with a local server:

```bash
cd github-website
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy To GitHub Pages

Recommended path:

1. Create a new GitHub repository.
2. Upload the contents of this `github-website/` folder as the repository root.
3. Go to repository settings, then Pages.
4. Set the source to GitHub Actions.
5. Push to the `main` branch. The included workflow deploys the site.

Alternative path:

- If you want this inside an existing repository without Actions, copy the contents into a `docs/` folder and set GitHub Pages to deploy from `main /docs`.

## Styling

Change colors and layout tokens at the top of `assets/css/styles.css`:

```css
:root {
  --paper: #f7f3ec;
  --ink: #17191d;
  --teal: #087e8b;
  --coral: #cf5b3f;
}
```

The site is intentionally no-build: no npm install, no framework, and no external CDN required.
