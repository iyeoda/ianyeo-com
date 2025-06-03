# Blog Management Guide

This directory contains blog posts for the Ian Yeo website. The blog system automatically fetches and displays posts from this GitHub repository.

## How It Works

The blog section on the website uses the GitHub API to:
1. Fetch markdown files from this `blog/` directory
2. Parse frontmatter metadata (title, date, category, excerpt)
3. Display the 3 most recent posts on the homepage
4. Link to the full posts on GitHub

## Adding New Blog Posts

### File Naming Convention
Use the format: `YYYY-MM-DD-post-slug.md`

Examples:
- `2025-01-15-ai-trends-2025.md`
- `2025-02-01-leadership-in-crisis.md`

### Frontmatter Format
Each blog post should start with YAML frontmatter:

```yaml
---
title: "Your Post Title"
date: "YYYY-MM-DD"
category: "Category Name"
excerpt: "A brief description of the post content that will appear in the preview."
---
```

### Supported Categories
- **Leadership** - Management and leadership insights
- **AI & Innovation** - Technology and innovation topics
- **Digital Strategy** - Digital transformation and strategy
- **PropTech** - Property technology industry topics
- **Insights** - General business insights

## Content Guidelines

### Title
- Keep titles concise but descriptive
- Use title case
- Avoid excessive punctuation

### Date
- Use ISO format: YYYY-MM-DD
- This determines the order posts appear (newest first)

### Category
- Choose from the supported categories above
- Categories affect the color and styling of the category badge

### Excerpt
- 150-200 characters recommended
- Should entice readers to click through
- Will be automatically generated from content if not provided

### Content
- Use standard Markdown formatting
- Include headers for better structure
- Add a brief author bio at the end if desired

## Example Post Structure

```markdown
---
title: "The Future of Construction Technology"
date: "2025-01-15"
category: "AI & Innovation"
excerpt: "Exploring how emerging technologies are reshaping the construction industry and what leaders need to know."
---

# The Future of Construction Technology

Your content here...

## Key Sections

Use headers to structure your content...

### Subsections

Break down complex topics...

---

*Author bio or closing note*
```

## Deployment

Changes to this directory are automatically reflected on the website:

1. **Immediate**: New posts appear within minutes of being committed to the main branch
2. **Automatic**: No manual deployment or build process required
3. **Cached**: GitHub API responses are cached by browsers for performance

## Editing Posts

To edit existing posts:
1. Locate the markdown file in this directory
2. Make your changes
3. Commit to the main branch
4. Changes will appear on the website automatically

## Deleting Posts

To remove a post:
1. Delete the markdown file from this directory
2. Commit the change
3. The post will no longer appear on the website

## Troubleshooting

If posts aren't appearing:
1. Check the file naming convention (must be `.md`)
2. Verify the frontmatter format is correct
3. Ensure the file is in the main branch
4. Check browser cache (hard refresh may be needed)

## Technical Details

- **API Endpoint**: `https://api.github.com/repos/ianyeo1/ianyeo-com/contents/blog`
- **Rate Limits**: GitHub API allows 60 requests per hour for unauthenticated requests
- **File Size**: Keep markdown files under 1MB for best performance
- **Images**: Store images in a separate `blog/images/` directory and reference them relatively

## Future Enhancements

Potential improvements to consider:
- RSS feed generation
- Search functionality
- Tag system
- Comments via GitHub Discussions
- Newsletter integration 