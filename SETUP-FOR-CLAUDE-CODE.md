# Waypoint — Setup for Claude Code

Run these commands from your WayPoint folder to finish the setup.

## Step 1: Remove stale lock file

```bash
rm -f .git/index.lock
```

## Step 2: Remove nested git repo in gas-mvp

The parent repo already tracks all gas-mvp history (22 commits). The nested `.git/` is redundant.

```bash
rm -rf gas-mvp/.git
```

## Step 3: Create GitHub repo and push

```bash
# Create the repo on GitHub (private by default)
gh repo create mcbeebe/waypoint --private --source=. --push

# OR if you prefer to use an existing repo:
# git remote add origin https://github.com/mcbeebe/waypoint.git
```

## Step 4: Stage and commit everything

```bash
# Stage all untracked files + modifications
git add -A

# Commit
git commit -m "chore: prepare repo for Claude Code development

- Add CLAUDE.md with full project context
- Add comprehensive .gitignore
- Track all business docs, prototypes, and code
- Remove gas-mvp nested .git (absorbed into parent)"

# Push
git push -u origin main
```

## Step 5: Open in Claude Code

```bash
cd /path/to/WayPoint
claude
```

Claude Code will automatically read CLAUDE.md and understand the full project context.

## Optional: Link to GitHub Project Board

Your project board: https://github.com/users/mcbeebe/projects/1

To link issues from Claude Code:
```bash
# Create an issue linked to the project
gh issue create --title "Feature: ..." --body "..." --project "mcbeebe/1"
```
