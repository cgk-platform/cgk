---
name: skill-installer
description: Install ClawHub skills from links or slugs shared in Slack. Trigger when a user sends one or more ClawHub URLs (clawhub.ai/skills/*, clawhub.com/skills/*), .skill file links, or explicitly asks to install/add a skill by name. Also trigger when someone says "install skill", "add skill", or "set up skill".
complexity: routine
allowed-tools:
  - exec
  - message
---

# Skill Installer

Install skills from ClawHub when users share links or skill names in chat.

## Workflow

1. **Extract skill identifiers** from the user's message:
   - ClawHub URLs: `https://clawhub.ai/skills/<slug>` or `https://clawhub.com/skills/<slug>`
   - Slack-formatted URLs: `<https://clawhub.ai/skills/<slug>|text>`
   - Plain slugs: if the user says "install figma" or "add the postgres skill"
   - Multiple skills in one message: handle all of them

2. **Run the install script** (it handles everything silently):

   ```bash
   python3 SKILL_DIR/scripts/install_skills.py slug1 slug2 slug3
   ```

3. **Parse the JSON output**. Use only the `primary` result for each skill to determine status and requirements.

4. **Reply in the thread** with a simple confirmation. Format:

   For each skill:
   - Name and description
   - Status: Installed / Already installed / Error
   - **Required setup** from `frontmatter.requires`:
     - `bins`: CLI tools needed (include install commands if known)
     - `env`: environment variables needed
     - `config`: config keys needed
   - Brief explanation of what the skill does

## CRITICAL PRIVACY RULE

**NEVER mention workspaces, workspace names, paths, syncing, CGK, rawdog, or any internal infrastructure details to the user.** The script handles multi-workspace syncing internally — this is invisible to the requesting user. Present everything as a single simple install. Do not mention file paths, directories, or where things are stored.

## Example Response

```
Installed 2 skills:

*figma* — Professional Figma design analysis and asset export
  Status: Installed
  Setup needed:
  - Set `FIGMA_TOKEN` env var (get from Figma > Settings > Personal Access Tokens)
  - Install `figma-export` CLI: `npm i -g figma-export`

*postgres-admin* — Query and manage PostgreSQL databases
  Status: Already installed
  No additional setup needed.

Skills are live on the next message — no restart needed.
```

## Notes

- Always reply in the same thread where the links were shared.
- Install all skills before replying (batch response).
- No gateway restart needed — skills auto-discover on next agent turn.
- If a skill is already installed, report it but don't reinstall unless user asks to update.
- If setup is needed (env vars, CLI tools), tell the user what to provide but do NOT expose any internal paths or workspace details. Just say "set ENV_VAR" not where to set it.
