---
name: weekly-report
description: Generate a "Weekly Update" status report for the Actifyr client platform, grouping the week's git commits and merged PRs into thematic bullets. Use when the user asks for a "weekly report", "weekly update", "status update for this week", "what did I do this week", or similar recurring status-report requests for this repo. Read-only — never make code changes as part of this skill.
---

Produces a short, non-technical "Weekly Update" summary of the work done in this repo over a week, in the exact format the user has standardized on (see Output format below). This is a **reporting skill only** — never edit, commit, or push anything while running it, even if the underlying work being summarized involved code changes.

## Step 1 — Resolve the date range

Default range is **Monday through today** of the current week, unless the user names a different week or range ("last week", "week of Jul 28", "Monday to Friday").

```bash
date
```

Compute the Monday of the target week and the end-of-range date (today, or the Friday/Sunday of a past week if the user asked for a full prior week).

## Step 2 — Gather the raw activity

Get the git author identity, then pull commits and merged PRs in the date range, across all branches (work often lands on a long-lived feature branch like `vizz-dev` before merging):

```bash
git config user.name

git log --all --author="<name>" --since="<Monday> 00:00:00" --until="<end-date+1> 00:00:00" \
  --date=format:"%a %Y-%m-%d %H:%M" --pretty=format:"%h|%ad|%s" | sort -t'|' -k2

gh pr list --json number,title,body,mergedAt,url,files \
  --search "author:<github-username> merged:>=<Monday>" --state merged
```

Read each merged PR's `body` (Summary section) and changed `files` for the concrete detail behind each commit — commit subjects alone are usually too terse to synthesize a good bullet from. If a PR is still open (not yet merged) but has commits in range, note it as in-progress rather than omitting it.

## Step 3 — Synthesize into themes, not a commit dump

Do **not** produce one bullet per commit or per PR. Read across everything gathered and group it into **4–6 thematic bullets** — each one a single line covering one area of work, even if that area spans multiple PRs/commits. Match the tone and structure of this real example:

```
Weekly Update — Week of Aug 3, 2026

Actifyr

•⁠  ⁠CSV bulk import rework — migrated from client-side parsing to backend CSV import flow, added error modal for row-level issues with copy-to-clipboard, and updated payload to include schedule date/time fields
•⁠  ⁠Planner calendar UX — recolored calendar cells, added draft/finalized state indicators, and disabled text selection
•⁠  ⁠Content Builder fixes — resolved hydration issues, optimized component expand/collapse behavior, and streamlined discard-changes prompts
•⁠  ⁠Media & visual updates — replaced default audio thumbnail and added borders, spacing, and filename truncation to media listings
•⁠  ⁠Program engagement indicators — added color-coded progress bars (red, orange, yellow, green) based on engagement metrics
```

Guidance for writing each bullet:
- **Bold the theme, then an em dash, then a comma-separated clause list** of what changed within it — mirror the example's cadence exactly.
- Order bullets roughly by impact/significance, biggest feature work first, small polish/visual items last.
- Keep each bullet to one line. Push detail down to clause-level phrases ("added X", "fixed Y", "replaced Z"), not full sentences.
- Write for a semi-technical audience (leadership/PM, not just engineers) — name the user-visible feature or outcome, not internal file/function names.
- Skip pure noise (typo fixes, lint-only changes, dependency bumps) unless that's genuinely most of the week's activity.

## Output format

```
Weekly Update — Week of <Monday's date, "Mon D, YYYY">

Actifyr

•⁠  ⁠<Theme> — <clause>, <clause>, and <clause>
•⁠  ⁠<Theme> — <clause>, <clause>
...
```

Reply with this as plain text in the chat — do not wrap it in a code block, and do not create a file or Artifact unless the user explicitly asks for one this time.
