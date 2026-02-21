# Plan 08: Final Polish & npm link

## Goal

Final cleanup, error handling improvements, build verification, and ensure the tool is production-ready and globally accessible.

## Prerequisites

- All previous plans (01-07) completed
- All commands implemented and tested

## Steps

### 1. Error handling audit

Review every command and ensure:
- Network errors are caught and show helpful messages (not raw stack traces)
- Rate limit errors (`429`) show "Rate limited. Try again in X seconds." with the `x-rate-limit-reset` header
- Auth errors (`401`, `403`) suggest running `x-cli auth`
- Missing `.env` vars give clear setup instructions

### 2. Character count helper

Add a utility function used by `createTweet` and `createThread`:
- Count characters using Twitter's rules (URLs count as 23 chars regardless of length, emojis may count as 2)
- For simplicity, use `text.length` but note in error messages that URLs are counted differently by X

### 3. Username caching

The `tweets list` and `tweets thread` commands need the authenticated user's username (for URLs). To avoid an extra API call every time:
- On first `me` or `auth status` call, cache the username + user ID to `.env` as `X_USER_ID` and `X_USERNAME`
- Use cached values when available, fall back to API call

### 4. Help text improvements

Ensure every command has:
- Clear description
- Example in the help text (use `.addHelpText('after', ...)`)
- All options documented

### 5. Clean build

```bash
cd ~/tools/x-cli
rm -rf dist node_modules
npm install
npm run build
```

Verify no TypeScript errors, no warnings.

### 6. npm link

```bash
npm link
x-cli --help
x-cli auth status
x-cli me
x-cli tweets list -n 3 --pretty
```

Verify everything works from a different directory:
```bash
cd /tmp
x-cli tweets list --pretty
```

### 7. Update AGENTS.md and README.md

Review both files against the actual implementation:
- Ensure all commands listed actually exist
- Ensure all options are documented
- Update any examples that changed during implementation

### 8. Add to tools index

Edit `~/tools/AGENTS.md` and add x-cli to the tool table:
```
| [x-cli](x-cli/) | Organic X/Twitter posting, threads, timeline |
```

Also add to `~/tools/sync.sh` repos list for cross-machine syncing.

## Deliverables

- All error paths handled gracefully
- Clean build with no warnings
- Tool globally accessible via `npm link`
- Documentation matches implementation
- Tool registered in `~/tools/AGENTS.md`

## Success Criteria

- `x-cli` works from any directory
- Every command has clear `--help` output
- Errors never show raw stack traces
- Rate limit errors are handled gracefully
- Documentation is accurate and complete
