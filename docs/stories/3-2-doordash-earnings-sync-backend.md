# Story 3.2: DoorDash Earnings Sync Backend

**Epic:** 3 - Platform Account Linking
**Story ID:** 3.2
**Status:** done
**Priority:** P0
**Created:** 2026-01-02

---

## User Story

**As a** user with a connected DoorDash account,
**I want** my earnings to sync automatically,
**So that** I see my DoorDash deliveries in Giglet.

---

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Sync job fetches deliveries from DoorDash | Job runs and retrieves data |
| AC2 | Each delivery stored with timestamp, base_pay, tip, restaurant | Delivery records created in DB |
| AC3 | Sync status updated to "success" with timestamp | PlatformAccount.lastSyncAt updated |
| AC4 | Session expiration triggers "Error: Please reconnect" | Status set to ERROR, lastSyncError populated |
| AC5 | Initial sync triggered on account connection | POST /platforms/connect triggers first sync |
| AC6 | Sync jobs queued, not blocking API | BullMQ job queue used |
| AC7 | Rate limiting prevents platform detection | Delays between requests, max requests/minute |

---

## Tasks

### Task 1: Set Up BullMQ Job Queue Infrastructure
- [ ] Install BullMQ and ioredis dependencies
- [ ] Create Redis connection configuration
- [ ] Create queue worker setup in `src/jobs/worker.ts`
- [ ] Add queue health check to existing health endpoint

### Task 2: Create DoorDash Scraping Service
- [ ] Install Puppeteer (or Playwright) for headless browser
- [ ] Create `src/services/platforms/doordash.service.ts`
- [ ] Implement `login(credentials)` - authenticate and get session
- [ ] Implement `fetchEarnings(session, dateRange)` - scrape earnings page
- [ ] Implement `checkSession(session)` - validate session still valid
- [ ] Add rate limiting (delays between requests)

### Task 3: Create Platform Sync Job
- [ ] Create `src/jobs/platform-sync.job.ts`
- [ ] Implement sync logic: decrypt creds → login → fetch → store
- [ ] Handle errors with exponential backoff (3 attempts)
- [ ] Update PlatformAccount status on success/failure
- [ ] Store session cookies for reuse (avoid re-login each sync)

### Task 4: Integrate Sync with Account Connection
- [ ] Modify POST /api/v1/platforms/connect to queue initial sync
- [ ] Create GET /api/v1/platforms/:id/sync endpoint for manual trigger
- [ ] Return sync status in platform list response

### Task 5: Schedule Recurring Syncs
- [ ] Add cron job to sync all connected accounts every 4 hours
- [ ] Stagger job start times to avoid thundering herd
- [ ] Implement job deduplication (no concurrent syncs for same account)

---

## Technical Notes

### DoorDash Scraping Approach

DoorDash doesn't have a public API. We use headless browser to:
1. Navigate to DoorDash Dasher login page
2. Enter credentials and authenticate
3. Navigate to earnings/payments page
4. Parse the page content (HTML or internal API responses)
5. Extract delivery records

```typescript
// Pseudocode for DoorDash service
class DoorDashService {
  private browser: Browser;

  async login(email: string, password: string): Promise<SessionCookies> {
    const page = await this.browser.newPage();
    await page.goto('https://identity.doordash.com/auth');
    await page.fill('input[name=email]', email);
    await page.fill('input[name=password]', password);
    await page.click('button[type=submit]');
    await page.waitForNavigation();
    return await page.context().cookies();
  }

  async fetchEarnings(cookies: SessionCookies, since: Date): Promise<Delivery[]> {
    // Navigate to earnings page with stored cookies
    // Parse earnings data from page or intercept API calls
    // Return normalized delivery objects
  }
}
```

### BullMQ Job Structure

```typescript
// jobs/platform-sync.job.ts
interface SyncJobData {
  platformAccountId: string;
  userId: string;
  isInitialSync: boolean;
}

syncQueue.process(async (job: Job<SyncJobData>) => {
  const { platformAccountId, isInitialSync } = job.data;

  // 1. Get platform account
  // 2. Decrypt credentials
  // 3. Login or reuse session
  // 4. Fetch earnings since last sync
  // 5. Upsert deliveries
  // 6. Update lastSyncAt
});
```

### Error Handling

| Error Type | Action |
|------------|--------|
| Invalid credentials | Set status=ERROR, clear session |
| Session expired | Attempt re-login, queue retry |
| Rate limited by platform | Exponential backoff, retry later |
| Network error | Retry up to 3 times |
| Scraping failed (page changed) | Alert developer, set status=ERROR |

### Security Considerations

- Never log decrypted credentials
- Session cookies encrypted at rest
- Puppeteer runs in sandbox mode
- Rate limit API calls to avoid detection
- Random delays between actions (human-like behavior)

### De-risking Notes (from PRD discussion)

This is the **riskiest feature** in the app. Mitigations:
- Build manual entry + CSV import as fallbacks (Story 3.1 already has UI)
- Monitor sync failure rates for early detection of platform changes
- Design scraper to be easily updatable when DoorDash changes their site

---

## Dependencies

### Prerequisites
- Story 3.1: DoorDash Account Connection UI (completed)
- Redis instance available (for BullMQ)

### Environment Variables Required
```
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte-hex-key>  # Already exists
```

---

## Definition of Done

- [ ] All acceptance criteria verified
- [ ] Unit tests for sync job logic
- [ ] Integration test with mocked DoorDash responses
- [ ] Manual test: connect account → verify deliveries synced
- [ ] Error cases tested (bad creds, session expiry)
- [ ] No credentials logged anywhere
- [ ] Code reviewed

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-02 | Claude | Story created |
