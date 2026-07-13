# PR workflow (local)

This environment has no authenticated GitHub remote (`gh auth status` fails),
so pull requests cannot be opened on GitHub. To honor the milestone process —
document → branch → PR → merge before the next milestone — we use a local
equivalent that preserves every artifact of a real PR flow:

1. Each milestone is developed on a feature branch: `milestone/NN-name`.
2. Commits on the branch are granular with meaningful messages.
3. Before merging, a PR description is written to `docs/prs/NNNN-name.md`
   containing: title, branch, summary of what the milestone delivered,
   notable decisions, and test evidence. This file **is** the PR body.
4. The branch is merged into `main` with `git merge --no-ff`, and the merge
   commit message references the PR document (like a squash-merge subject).

If a GitHub remote is added later, `git push --all` preserves the full branch
and merge history, and the `docs/prs/` files can be pasted into real PRs.
