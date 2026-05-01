# AGENTS.md

## Purpose

This repository is a source-first Hexo blog.

The `main` branch stores the blog's actual working assets: content, site configuration, theme overrides, CI workflows, and project documentation. Build output is handled by GitHub Actions via Pages artifact upload, with no separate deployment branch.

Any agent operating in this repository should treat it as a content-and-infrastructure project rather than a generic Node.js app. Changes here can affect not only local development, but also site rendering, deployment behavior, URL stability, and the long-term maintainability of the author's writing workflow.

This document defines how agents should reason about the repository, how they should communicate before making changes, and how they should preserve the structure of the blog over time.

## Operating Principle

Work from the repository outward:

1. Understand the current branch model, build flow, and content organization before changing anything.
2. Prefer the smallest correct change that preserves site behavior.
3. Keep source-of-truth files in `main`; do not treat generated output as editable content.
4. Avoid speculative refactors that do not improve authoring, deployment, or maintainability.

The blog is both a publishing system and a personal knowledge archive. Structural changes should preserve that dual role.

## Mandatory Pre-Change Confirmation

Before executing any change-making command, an agent must first present a concise confirmation block to the user and wait for approval.

This rule applies to commands or edits that change repository state, including but not limited to:

- file creation, deletion, rename, or modification
- dependency installation or removal
- git commit, rebase, merge, stash, pull, push, branch operations
- build steps that overwrite tracked outputs or caches
- configuration updates that affect deployment, editor behavior, or rendering

This rule does not apply to read-only inspection such as reading files, searching, listing, viewing git history, or checking workflow status.

The confirmation block must contain all three parts below:

### 1. Change Commands

List the exact commands or file operations to be executed.

Examples:

- `npm install`
- `git pull origin main`
- `update .github/workflows/pages.yml`
- `create AGENTS.md`

### 2. Change Purpose

State why the change is needed in repository terms, not just tool terms.

Examples:

- align local dependencies with merged lockfile updates
- remove an invalid Pages configuration that creates a bad `CNAME`
- add contributor/agent instructions for safe repository changes

### 3. Impact Scope

Describe what areas may be affected.

Examples:

- documentation only
- local development environment only
- CI/CD workflow and deployment behavior
- theme rendering and generated pages

### Approval Requirement

After presenting the above, the agent must wait for the user to confirm before executing the change.

If multiple independent changes are planned, group them clearly. If one part is high-risk, ask for confirmation specifically for that part instead of bundling it into a broad approval.

## Repository Architecture

This project should be understood in four layers.

### 1. Content Layer

The content layer lives primarily under `source/`.

- `source/_posts/` contains the published writing in Markdown.
- `source/index/`, `source/list/`, `source/tags/`, and `source/categories/` define navigational pages.
- `source/img/` contains site assets referenced by the theme and content.

This layer is the long-lived knowledge base. Agents should avoid bulk renames, permalink-affecting moves, or front-matter rewrites unless there is a clear user goal.

### 2. Site Configuration Layer

This layer defines how Hexo interprets and renders the content.

- `_config.yml` is the canonical site-level configuration.
- `scaffolds/` defines authoring defaults for new posts and pages.
- `package.json` and `package-lock.json` define the toolchain and runtime dependencies.

Changes here affect build behavior, URL generation, plugins, and local authoring ergonomics.

### 3. Theme Layer

This repository uses `hexo-theme-anzhiyu` via npm, with local overrides in `_config.anzhiyu.yml`.

Agents should treat `_config.anzhiyu.yml` as the customization boundary. Prefer changing override config rather than editing vendored theme code. If a desired behavior cannot be achieved through configuration, call that out explicitly before proposing a deeper theme change.

### 4. Delivery Layer

The delivery path is:

`main` source -> GitHub Actions build -> generated static files -> Pages artifact -> GitHub Pages hosting

That means:

- `main` is the source of truth.
- local `public/` is a build artifact, not a canonical repository layer.
- generated output is uploaded as a Pages artifact, not pushed to a branch.

Agents should avoid reintroducing workflows that publish generated output back into `main`.

## Branch Model

### `main`

Holds:

- Hexo source content
- site and theme configuration
- workflow definitions
- project documentation
- editor and repository policy files

This is the only branch that should be manually edited for normal work.

### `gh-pages`

This branch no longer exists. All deployment is handled via GitHub Pages artifact upload.

## Deployment Intent

The intended deployment model is build-on-push from `main`, with static output uploaded as a Pages artifact and served directly by GitHub Pages.

Agents should preserve the following invariants:

- there is one clear publishing path
- generated files do not become the editable source of truth
- Jekyll-specific behavior is disabled where necessary for Hexo output

If a deployment issue appears, diagnose it by separating these concerns:

1. source build correctness
2. workflow correctness
3. branch publishing correctness
4. GitHub Pages settings correctness
5. domain/CNAME correctness

## Documentation Strategy

This repository should remain self-describing.

At minimum, the following files together should explain the project:

- `README.md`: project-facing overview and usage
- `AGENTS.md`: operational rules for agents and structural intent
- workflow files under `.github/workflows/`: executable deployment policy

When adding documentation, prefer durable guidance over temporary troubleshooting notes.

## Change Design Guidance

Agents should design changes in a way that matches the nature of this repository.

### Prefer changes that improve one of these dimensions

- publishing reliability
- source clarity
- authoring ergonomics
- deployment transparency
- repository hygiene

### Be cautious with changes that affect

- permalinks
- post filenames
- front-matter structure across many posts
- theme behavior that changes reading experience
- GitHub Pages source and deployment configuration

### Avoid unnecessary complexity

Do not add extra tooling, helper scripts, or alternate deployment paths unless there is a concrete maintenance benefit.

## Local Environment Expectations

This project is primarily a Node.js/Hexo workspace.

Agents should preserve an editor experience that supports that model:

- Node-based work should function cleanly in the repository root.
- Python environment auto-activation is not required for this project and may be distracting.
- line ending behavior should be stabilized at the repository level to avoid noisy diffs.

## Files Agents Should Treat Carefully

### `_config.yml`

Changes may affect canonical URL generation, plugin behavior, or global rendering.

### `_config.anzhiyu.yml`

Changes may alter navigation, appearance, reading layout, or asset references.

### `.github/workflows/pages.yml`

Changes may break deployment or publish to the wrong branch.

### `package.json` and `package-lock.json`

Changes affect both local development and CI reproducibility.

### `source/_posts/`

These are the archive itself. Avoid accidental deletion, mass normalization, or content-destructive edits.

## Recommended Workflow For Agents

When asked to make changes, use this default sequence:

1. Inspect relevant files and current repository state.
2. Summarize the intended change commands, purpose, and impact scope.
3. Wait for user confirmation.
4. Make the smallest correct change.
5. Verify with the least invasive validation that proves correctness.
6. Report what changed, what was verified, and any remaining manual follow-up.

## Validation Expectations

When relevant, prefer validation that matches the layer being changed.

- Documentation changes: check file placement and clarity.
- Dependency changes: ensure lockfile consistency and local installability.
- Hexo/config/theme changes: run a build such as `npx hexo generate` when appropriate.
- Workflow changes: inspect for branch, artifact, and publish-dir correctness; use GitHub Actions status when available.

Do not run heavyweight or stateful commands unless they are justified and confirmed under the pre-change rule above.

## Long-Term Direction

This repository should continue moving toward a stable, comprehensible publishing system where:

- writing remains easy to maintain
- theme customization stays explicit and local
- deployment is automated and single-path
- documentation explains not just what exists, but why the structure exists

Agents should support that direction with clear, minimal, well-scoped changes.
