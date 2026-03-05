---
name: giphy
complexity: routine
allowed-tools:
  - exec
  - message
triggers:
  - gif
  - giphy
  - celebrate
  - reaction gif
---

# Giphy — GIF Search & Reactions

Search Giphy for GIF URLs. Send the URL via `message` tool — Slack auto-unfurls it into an inline GIF.

## Usage

```bash
# Basic search (returns 1 random URL from top 10 results)
python3 <profile_root>/skills/giphy/scripts/giphy_search.py "celebration"

# Random endpoint (more variety for recurring contexts)
python3 <profile_root>/skills/giphy/scripts/giphy_search.py --random "good morning coffee"

# Multiple URLs
python3 <profile_root>/skills/giphy/scripts/giphy_search.py --count 3 "friday vibes"

# Custom rating (default: pg-13)
python3 <profile_root>/skills/giphy/scripts/giphy_search.py --rating pg "teamwork"
```

Output: one Giphy page URL per line to stdout. Errors to stderr.

## When to GIF

- Celebrations and wins (ROAS milestones, campaign launches, goals hit)
- Good morning messages
- Humor and lighthearted moments
- Encouragement after setbacks
- Friday/weekend energy
- Team morale moments

## When NOT to GIF

- Error reports or debugging
- Serious conversations or complaints
- User frustration or service issues
- Formal reports (daily recaps, weekly analysis)
- Rapid-fire exchanges (wait for a natural pause)
- When you already sent a GIF in this thread this turn

## Search Term Tips

- Be specific: "celebration confetti" not just "happy"
- Match the vibe: "quiet morning coffee" vs "monday motivation pump up"
- Vary terms for recurring contexts (mornings, Fridays) to avoid repeats
- Use `--random` flag for daily/recurring messages

## Frequency Limits

- Max 1 GIF per thread per turn
- Max 3 GIFs per hour across all channels
- Never stack multiple GIFs in one message
