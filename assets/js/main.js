(function () {
  const toneMap = {
    teal: "#087e8b",
    coral: "#cf5b3f",
    olive: "#758c1f",
    blue: "#315bb7",
    gold: "#b77c1c"
  };

  const pageRenderers = {
    home: renderHome,
    roadmap: renderRoadmap,
    experience: renderExperience,
    projects: renderProjects,
    blog: renderBlog,
    post: renderPost,
    contact: renderContact
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const site = await getJSON("content/site.json");
      renderChrome(site);
      setupMenu();

      const page = document.body.dataset.page || "home";
      if (pageRenderers[page]) {
        await pageRenderers[page](site);
      }
    } catch (error) {
      renderNotice(error);
      console.error(error);
    }
  }

  async function getJSON(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load ${path}`);
    }
    return response.json();
  }

  async function getText(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load ${path}`);
    }
    return response.text();
  }

  function renderChrome(site) {
    setAll("[data-brand-name]", site.name);
    setAll("[data-brand-role]", site.role);
    setAll("[data-brand-initials]", initials(site.name));

    const nav = document.querySelector("[data-site-nav]");
    if (nav) {
      const currentFile = currentPageFile();
      nav.innerHTML = site.nav.map((item) => {
        const active = isActiveNav(item.href, currentFile) ? " is-active" : "";
        return `<a class="${active.trim()}" href="${escapeAttr(item.href)}">${escapeHTML(item.label)}</a>`;
      }).join("");
    }

    const footer = document.querySelector("[data-site-footer]");
    if (footer) {
      const links = site.social.map((item) => {
        return `<a href="${escapeAttr(item.url)}"${externalAttrs(item.url)}>${escapeHTML(item.label)}</a>`;
      }).join("");
      footer.innerHTML = `
        <div class="footer-inner">
          <span>© ${new Date().getFullYear()} ${escapeHTML(site.name)}. Built for GitHub Pages.</span>
          <div class="footer-links">${links}</div>
        </div>
      `;
    }
  }

  function setupMenu() {
    const button = document.querySelector("[data-menu-button]");
    const nav = document.querySelector("[data-site-nav]");
    if (!button || !nav) return;

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      document.body.classList.toggle("nav-open", !expanded);
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        button.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });
  }

  async function renderHome(site) {
    const hero = site.hero;
    set("[data-hero-eyebrow]", hero.eyebrow);
    set("[data-hero-headline]", hero.headline);
    set("[data-hero-body]", hero.body);
    set("[data-hero-caption]", hero.caption);

    const heroImage = document.querySelector("[data-hero-image]");
    if (heroImage) {
      heroImage.src = hero.image;
      heroImage.alt = hero.imageAlt;
    }

    const primary = document.querySelector("[data-hero-primary]");
    if (primary) {
      primary.textContent = hero.primaryCta.label;
      primary.href = hero.primaryCta.href;
    }

    const secondary = document.querySelector("[data-hero-secondary]");
    if (secondary) {
      secondary.textContent = hero.secondaryCta.label;
      secondary.href = hero.secondaryCta.href;
    }

    renderMetrics(site.metrics, document.querySelector("[data-home-metrics]"));
    renderFocus(site.focus, document.querySelector("[data-home-focus]"));

    const roadmap = await getJSON("content/roadmap.json");
    renderRoadmapPreview(roadmap.slice(0, 4), document.querySelector("[data-home-roadmap]"));

    const posts = await getJSON("content/posts/index.json");
    renderPostCards(posts.slice(0, 3), document.querySelector("[data-latest-posts]"));
  }

  async function renderRoadmap() {
    const roadmap = await getJSON("content/roadmap.json");
    const container = document.querySelector("[data-roadmap-list]");
    if (!container) return;

    container.innerHTML = roadmap.map((item) => {
      const bullets = (item.evidence || []).map((entry) => `<li>${escapeHTML(entry)}</li>`).join("");
      const color = toneMap[item.tone] || toneMap.teal;
      return `
        <article class="roadmap-item">
          <div class="roadmap-year">${escapeHTML(item.period)}</div>
          <div class="roadmap-card">
            <div class="status-line">
              <span class="status-dot" style="background:${color}"></span>
              <span class="meta-line">${escapeHTML(item.status)}</span>
            </div>
            <h2>${escapeHTML(item.title)}</h2>
            <p>${escapeHTML(item.summary)}</p>
            <ul class="bullet-list">${bullets}</ul>
          </div>
        </article>
      `;
    }).join("");
  }

  async function renderExperience() {
    const experience = await getJSON("content/experience.json");
    const container = document.querySelector("[data-experience-list]");
    if (container) {
      container.innerHTML = experience.map((item) => {
        const bullets = item.highlights.map((entry) => `<li>${escapeHTML(entry)}</li>`).join("");
        const stack = renderTokens(item.stack, "experience-stack");
        return `
          <article class="experience-item">
            <div>
              <p class="experience-time">${escapeHTML(item.period)}</p>
              <p class="meta-line">${escapeHTML(item.type)}</p>
            </div>
            <div>
              <h2>${escapeHTML(item.title)}</h2>
              <p>${escapeHTML(item.summary)}</p>
              <ul class="bullet-list">${bullets}</ul>
              ${stack}
            </div>
          </article>
        `;
      }).join("");
    }

    const site = await getJSON("content/site.json");
    renderPrinciples(site.principles, document.querySelector("[data-principles-list]"));
  }

  async function renderProjects() {
    const projects = await getJSON("content/projects.json");
    const container = document.querySelector("[data-project-list]");
    if (!container) return;

    container.innerHTML = projects.map((project) => {
      const actions = project.links.map((link) => {
        return `<a href="${escapeAttr(link.href)}"${externalAttrs(link.href)}>${escapeHTML(link.label)}</a>`;
      }).join("");
      return `
        <article class="project-card">
          <img src="${escapeAttr(project.image)}" alt="${escapeAttr(project.imageAlt)}">
          <div class="project-card-body">
            <p class="meta-line">${escapeHTML(project.category)}</p>
            <h3>${escapeHTML(project.title)}</h3>
            <p>${escapeHTML(project.summary)}</p>
            ${renderTokens(project.stack, "project-stack")}
            <div class="card-actions">${actions}</div>
          </div>
        </article>
      `;
    }).join("");
  }

  async function renderBlog() {
    const posts = await getJSON("content/posts/index.json");
    renderPostCards(posts, document.querySelector("[data-blog-posts]"));
  }

  async function renderPost() {
    const posts = await getJSON("content/posts/index.json");
    const slug = new URLSearchParams(window.location.search).get("slug") || posts[0]?.slug;
    const post = posts.find((entry) => entry.slug === slug);
    const container = document.querySelector("[data-post-container]");
    if (!container) return;

    if (!post) {
      container.innerHTML = `<div class="notice">Post not found. <a href="blog.html">Return to the blog</a>.</div>`;
      return;
    }

    const markdown = await getPostText(post);
    document.title = `${post.title} | Professional Journey`;
    container.innerHTML = `
      <header>
        <p class="kicker">Technical Blog</p>
        <h1>${escapeHTML(post.title)}</h1>
        <p class="post-meta">${escapeHTML(post.date)} · ${escapeHTML(post.readingTime)} · ${escapeHTML(post.category)}</p>
        <img class="post-hero-image" src="${escapeAttr(post.image)}" alt="${escapeAttr(post.imageAlt)}">
      </header>
      <div class="post-content">${markdownToHTML(markdown)}</div>
    `;
  }

  async function getPostText(post) {
    const candidates = [
      post.source,
      `content/posts/${post.slug}.txt`,
      `content/posts/${post.slug}.md`
    ].filter(Boolean);
    let lastError;

    for (const path of candidates) {
      try {
        return await getText(path);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Could not load post ${post.slug}`);
  }

  function renderContact(site) {
    set("[data-contact-heading]", site.contact.heading);
    set("[data-contact-copy]", site.contact.copy);

    const emailLink = document.querySelector("[data-contact-email]");
    if (emailLink) {
      emailLink.textContent = site.contact.emailLabel;
      emailLink.href = `mailto:${site.email}`;
    }

    const container = document.querySelector("[data-contact-links]");
    if (!container) return;
    const links = [
      { label: "Email", value: site.email, url: `mailto:${site.email}` },
      ...site.social.map((item) => ({ label: item.label, value: item.url.replace(/^https?:\/\//, ""), url: item.url }))
    ];

    container.innerHTML = links.map((item) => {
      return `
        <article class="contact-link">
          <h3>${escapeHTML(item.label)}</h3>
          <p><a href="${escapeAttr(item.url)}"${externalAttrs(item.url)}>${escapeHTML(item.value)}</a></p>
        </article>
      `;
    }).join("");
  }

  function renderMetrics(metrics, container) {
    if (!container) return;
    container.innerHTML = metrics.map((item) => {
      return `
        <article class="metric">
          <strong>${escapeHTML(item.value)}</strong>
          <span>${escapeHTML(item.label)}</span>
        </article>
      `;
    }).join("");
  }

  function renderFocus(items, container) {
    if (!container) return;
    container.innerHTML = items.map((item) => {
      return `
        <article class="focus-item">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.copy)}</p>
        </article>
      `;
    }).join("");
  }

  function renderPrinciples(items, container) {
    if (!container) return;
    container.innerHTML = items.map((item) => {
      return `
        <article class="principle-item">
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.copy)}</p>
        </article>
      `;
    }).join("");
  }

  function renderRoadmapPreview(items, container) {
    if (!container) return;
    container.innerHTML = items.map((item) => {
      return `
        <article class="roadmap-preview-card">
          <span>${escapeHTML(item.period)}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.summary)}</p>
        </article>
      `;
    }).join("");
  }

  function renderPostCards(posts, container) {
    if (!container) return;
    container.innerHTML = posts.map((post) => {
      return `
        <article class="post-card">
          <img src="${escapeAttr(post.image)}" alt="${escapeAttr(post.imageAlt)}">
          <div class="post-card-body">
            <p class="meta-line">${escapeHTML(post.date)} · ${escapeHTML(post.readingTime)}</p>
            <h3><a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h3>
            <p>${escapeHTML(post.excerpt)}</p>
            ${renderTokens(post.tags, "post-tags")}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderTokens(items, className) {
    if (!items || !items.length) return "";
    const tokens = items.map((item) => `<span class="stack-token">${escapeHTML(item)}</span>`).join("");
    return `<div class="${className}">${tokens}</div>`;
  }

  function markdownToHTML(markdown) {
    const lines = stripFrontMatter(markdown).replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let list = [];
    let listTag = "ul";
    let table = [];
    let inCode = false;
    let codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!list.length) return;
      html.push(`<${listTag}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listTag}>`);
      list = [];
      listTag = "ul";
    }

    function flushTable() {
      if (!table.length) return;
      html.push(tableToHTML(table));
      table = [];
    }

    function flushCode() {
      html.push(`<pre><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
      codeLines = [];
    }

    lines.forEach((line) => {
      if (line.startsWith("```")) {
        if (inCode) {
          inCode = false;
          flushCode();
        } else {
          flushParagraph();
          flushList();
          flushTable();
          inCode = true;
        }
        return;
      }

      if (inCode) {
        codeLines.push(line);
        return;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        flushTable();
        return;
      }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushParagraph();
        flushList();
        flushTable();
        const level = Math.min(heading[1].length + 1, 4);
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        return;
      }

      const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) {
        flushParagraph();
        flushList();
        flushTable();
        html.push(`<figure class="post-diagram"><img src="${escapeAttr(image[2])}" alt="${escapeAttr(image[1])}"></figure>`);
        return;
      }

      if (line.startsWith("> ")) {
        flushParagraph();
        flushList();
        flushTable();
        html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
        return;
      }

      const bullet = line.match(/^[-*]\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        flushTable();
        if (list.length && listTag !== "ul") flushList();
        listTag = "ul";
        list.push(bullet[1]);
        return;
      }

      const ordered = line.match(/^\d+\.\s+(.*)$/);
      if (ordered) {
        flushParagraph();
        flushTable();
        if (list.length && listTag !== "ol") flushList();
        listTag = "ol";
        list.push(ordered[1]);
        return;
      }

      if (isTableLine(line)) {
        flushParagraph();
        flushList();
        table.push(line.trim());
        return;
      }

      paragraph.push(line.trim());
    });

    flushParagraph();
    flushList();
    flushTable();
    if (inCode) flushCode();

    return html.join("");
  }

  function isTableLine(line) {
    const trimmed = line.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length > 2;
  }

  function tableToHTML(lines) {
    if (lines.length < 2 || !/^\|?[\s:|-]+\|[\s:|-]+\|?$/.test(lines[1])) {
      return `<p>${lines.map((line) => inlineMarkdown(line)).join("<br>")}</p>`;
    }

    const header = splitTableLine(lines[0]);
    const rows = lines.slice(2).map(splitTableLine);
    return `
      <div class="post-table-wrap">
        <table>
          <thead>
            <tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function splitTableLine(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function inlineMarkdown(value) {
    return escapeHTML(value)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_match, label, href) {
        const safeHref = escapeAttr(href);
        return `<a href="${safeHref}"${externalAttrs(href)}>${label}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function stripFrontMatter(markdown) {
    return markdown.replace(/^---[\s\S]*?---\s*/, "");
  }

  function currentPageFile() {
    const file = window.location.pathname.split("/").pop();
    return file || "index.html";
  }

  function isActiveNav(href, currentFile) {
    if (currentFile === "post.html" && href === "blog.html") return true;
    return href === currentFile;
  }

  function initials(name) {
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function set(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value || "";
  }

  function setAll(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value || "";
    });
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/`/g, "&#96;");
  }

  function externalAttrs(url) {
    return /^https?:\/\//.test(url) ? ' target="_blank" rel="noreferrer"' : "";
  }

  function renderNotice(error) {
    const main = document.querySelector("main");
    if (!main) return;
    const message = String(error.message || error);
    main.insertAdjacentHTML("afterbegin", `
      <section class="content-section">
        <div class="section-shell notice">
          <strong>Content could not load.</strong>
          <p>This static site uses local JSON and Markdown files. If you opened it directly from the filesystem, run <code>python3 -m http.server</code> inside <code>github-website/</code> and open the local server URL.</p>
          <p>${escapeHTML(message)}</p>
        </div>
      </section>
    `);
  }
})();
