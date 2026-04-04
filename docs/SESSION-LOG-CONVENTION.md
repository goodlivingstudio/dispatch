# Session Log Convention

Every working session with Claude should end with a full commit log and summary. This is the project's institutional memory.

---

## Format

At the end of each session, produce:

1. **Commit log** — every commit from the session, newest first, with hash and message
2. **Summary** — bulleted list of what was built, grouped by category
3. **For next session** — open items, unresolved bugs, and planned work

## Why

- **Continuity** — the next session (or a new Claude instance) can read the log and understand what happened
- **Accountability** — every change is tracked with a clear description
- **Decision record** — the log captures not just what changed but why (commit messages include rationale)
- **Progress visibility** — the operator can see velocity and direction at a glance

## Where

Session logs are produced in the conversation at session close. They are NOT committed as files — they live in the chat history and can be referenced by asking "show me the last session log."

The commit log itself is permanent in git history. The summary and next-session items exist in conversation context.

## When to Produce

- At the explicit end of a working session ("let's wrap")
- When switching to a fundamentally different workstream
- After any session longer than 2 hours
- On request ("give me a session log")

---

*Added to project conventions April 4, 2026.*
