# Branch Safety

- All project work MUST be performed exclusively on the exact Git branch `UH`.
- Before running any command that can modify the working tree, index, Git history, dependencies, generated files, local services, or remote state, verify the current branch with `git branch --show-current`.
- If the current branch is not exactly `UH`, STOP. Only read-only inspection is allowed until the repository is safely switched to `UH`.
- Never edit files, install or update dependencies, run write-capable scripts, commit, merge, rebase, pull, or push from any branch other than `UH`.
- If switching to `UH` is unsafe because the working tree is dirty or the operation could overwrite existing work, do not stash, discard, or move that work automatically; report the situation and ask the user how to proceed.

# Deployment Direction

- The deployment target for `UH` is a single VDS managed with Docker Compose.
- Prefer a simple, reliable Docker-based production setup over Kubernetes, Helm, or a new orchestrator unless the user explicitly changes this direction.
