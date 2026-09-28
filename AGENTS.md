<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Domain types live in src/types/medical.ts; mock data in src/data/* — never inline data in components (swap to DB later).
- Emergency numbers and locale/dir only in src/config/app.ts — single source for future settings/DB.
- Triage goes through RedFlagEngine (src/lib/red-flag-engine.ts); emergency always bypasses results.
- Health UI components in src/components/health/; colors only via tokens in src/styles.css.
- Curated page imagery lives in src/assets; use PageVisualHeader for consistent responsive page introductions.
