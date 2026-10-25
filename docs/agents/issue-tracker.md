# Issue tracker: GitHub

Use GitHub Issues in jaredkirby/hushfield for specs and implementation tickets. Use gh from this checkout. Read an issue including its comments before implementing it. Publish one issue per spec or ticket. Use --body-file for multiline content. Label implementation-ready specs and tickets ready-for-agent, creating that label if absent.

Publish approved tickets in dependency order. Use GitHub native sub-issue and blocking relationships where available; if unavailable, include explicit Parent and Blocked by references in the issue body. Do not modify or close the parent spec as part of ticket implementation. Record validation evidence on completed child tickets. PRs as a request surface: no.
