# Test Findings — account-service (Profiles / Posts / Voting)

**Date:** 2026-07-10
**Scope:** `account-service` module (Spring Boot 4.0.6, Spring Security 7, H2).
**Method:** Ran the full existing suite (baseline) + a temporary exploratory probe test
(`BugProbeTest`, since removed) that exercised edge cases via MockMvc and observed the
real HTTP status / DB side-effects.

> **No production code was modified.** This document records bugs only; fixes are
> proposed but **not applied**.

---

## 1. Baseline — existing suite

All existing tests pass:

```
AccountServiceApplicationTests      1/1
AuthAndDashboardIntegrationTest     9/9
PostVotingIntegrationTest           8/8
------------------------------------------
TOTAL                              18/18  BUILD SUCCESS
```

The happy paths and the primary failure paths (auth 401, duplicate email 409, vote
toggle, missing post 404) are correct and verified.

---

## 2. Confirmed bugs

### BUG-1 — Oversized field values return HTTP 500 instead of 400  *(Severity: Medium)*

Fields with no upper-bound validation overflow their DB column and surface a raw
`org.h2.jdbc.JdbcSQLDataException` → `DataIntegrityViolationException`, which is **not**
handled by `GlobalExceptionHandler`, so the client gets a **500 Internal Server Error**
for what is really bad input (should be **400**).

Confirmed via probe:

| Input | Column | Observed |
|---|---|---|
| `POST /api/posts` `content` = 20 000 chars | `posts.content` VARCHAR(10000) | **500** (`JdbcSQLDataException`) |
| `PUT /api/users/profile` `location` = 300 chars | `user_profiles.location` VARCHAR(255) | **500** |
| `PUT /api/users/profile` `profilePictureUrl` = 300 chars | VARCHAR(255) | **500** |

- Root cause: `PostCreateRequest.content` has no `@Size`; `ProfileUpdateRequest.location`
  and `profilePictureUrl` have no `@Size`; and there is no `@ExceptionHandler` for
  `DataIntegrityViolationException`.
- Note: `title` **is** bounded (`@Size(max = 255)`) and correctly returns 400, and `bio`
  is bounded (`@Size(max = 500)`), so the gap is specifically `content`, `location`,
  `profilePictureUrl`.
- Proposed fix (not applied): add `@Size` limits matching the column lengths on those
  three fields, and/or add a `DataIntegrityViolationException` handler returning 400/409.

### BUG-2 — `GET /api/users/profile` mutates state (creates a row)  *(Severity: Medium)*

`ProfileService.getOrCreate` lazily **inserts** an empty `user_profiles` row on read.
Confirmed via probe: rows before a single GET = 0, rows after = 1.

- Why it matters: HTTP GET is expected to be *safe* (no side effects). This makes the
  endpoint non-idempotent from a persistence view and, under **concurrent** first-time
  GETs for the same user, both requests can attempt the insert → the `user_id` unique
  constraint fires → one request gets a **500**.
- Proposed fix (not applied): create the profile at signup time, or return an empty/blank
  `ProfileResponse` on read without persisting, and only insert on `PUT`. If keeping
  lazy-create, guard the race (catch the unique violation and re-read).

### BUG-3 — Inconsistent error body for framework-level 400s  *(Severity: Low)*

Bean-validation errors return a structured JSON body
(`{timestamp,status,error,message,errors}`), but errors raised **before** the controller
body binds return a **400 with an empty body**:

| Input | Observed |
|---|---|
| Vote payload `{"type":"SIDEWAYS"}` (invalid enum) | 400, **empty body** |
| Malformed JSON `{ not json` | 400, **empty body** |

- Root cause: `HttpMessageNotReadableException` is not handled by
  `GlobalExceptionHandler`, so the default (empty) response is used. Status is correct;
  only the body shape is inconsistent with the rest of the API.
- Proposed fix (not applied): add an `@ExceptionHandler(HttpMessageNotReadableException.class)`
  returning the same structured 400 body.

---

## 3. Latent issues (from code review; not yet reachable via the current API)

### LATENT-1 — No cascade from `Post` → `Vote`  *(Severity: Medium, latent)*
`Vote` has `@ManyToOne(optional=false)` to `Post` with no cascade / orphan removal, and
there is no "delete post" endpoint yet. When one is added, deleting a post with votes will
fail with an FK violation unless votes are removed first (or `ON DELETE CASCADE` /
`orphanRemoval` is configured). The test cleanup already has to delete votes → posts →
profiles → users in FK order, which foreshadows this.

### LATENT-2 — Concurrency races on vote + profile create  *(Severity: Low/Medium, latent)*
`PostService.vote` does read-then-write (find existing vote → insert/update) and
`ProfileService.getOrCreate` does check-then-insert. Neither is atomic. Under simultaneous
requests the `(user_id, post_id)` / `user_id` unique constraints will surface as a 500
rather than being handled gracefully. Not exercised by the single-threaded tests.

### LATENT-3 — N+1 query on the post feed  *(Severity: Low, performance)*
`PostService.listAll` maps each `Post` and reads `post.getAuthor().getName()` on a
`LAZY @ManyToOne`, triggering one extra author SELECT per post. Fine for small data;
consider a `JOIN FETCH` / entity graph as the feed grows.

---

## 4. Design decisions worth confirming (not bugs)

- **Public post feed:** `GET /api/posts` is unauthenticated and returns full post
  `content` for every post (confirmed 200 without a token). This matches the brief
  ("retrieve a list of all posts") but is an intentional data-exposure choice — confirm it
  should be public.
- **Self-voting:** a user can upvote/downvote their **own** post (confirmed 200). The spec
  does not forbid it; flagging in case that's undesired.

---

## 5. Things verified as CORRECT

- Vote toggle logic: upvote → +1, switch to downvote → −1, same vote again → 0 (removed).
- Multi-user score accumulation (+2 with two upvoters).
- Unauthenticated writes/votes rejected with 401; wrong HTTP method → 405.
- Missing vote `type` and blank post `title` → 400 with structured error body.
- Vote on a non-existent post → 404.
- New post links to the authenticated author; feed reflects live `voteCount`.

---

## 6. Suggested priority

1. **BUG-1** (500 on oversized input) — add `@Size` + a `DataIntegrityViolationException` handler.
2. **BUG-2** (GET side-effect / concurrency 500) — create profile on signup or don't persist on read.
3. **BUG-3** (empty 400 body) — add `HttpMessageNotReadableException` handler.
4. **LATENT-1** before adding any delete-post endpoint.

---

## 7. Resolution — 2026-07-14

All findings above were fixed and are regression-tested by
`PostManagementIntegrationTest`:

- **BUG-1 fixed:** `@Size` added to `PostCreateRequest.content` (10000),
  `ProfileUpdateRequest.location` and `profilePictureUrl` (255); a
  `DataIntegrityViolationException` handler now returns a structured **409**.
- **BUG-2 fixed:** `ProfileService.getOrCreate` is now `readOnly` and never
  inserts; absent profiles are returned with blank fields. The row is created
  on `PUT` only.
- **BUG-3 fixed:** handlers added for `HttpMessageNotReadableException` and
  `MethodArgumentTypeMismatchException` — both return the standard structured
  400 body.
- **LATENT-1 fixed:** `DELETE /api/posts/{id}` added (author-only, returns 403
  otherwise) and deletes the post's votes first via `VoteRepository.deleteByPostId`.
- **LATENT-2 mitigated:** unique-constraint races now surface as structured 409
  instead of raw 500.
- **LATENT-3 fixed:** `@EntityGraph(attributePaths = "author")` on the feed and
  single-post queries removes the per-post author SELECT.

Also added in the same pass: `POST /api/auth/logout` (invalidates the bearer
token), signup now returns a usable token (auto-login), public
`GET /api/posts/{id}`, and CORS for `localhost` dev origins.
