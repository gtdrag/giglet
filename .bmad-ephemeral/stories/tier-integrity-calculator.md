# Story: Tier Integrity Calculator

Status: drafted

## Story

**As a** delivery driver,
**I want** to know exactly how many orders I can decline while maintaining my DoorDash tier status,
**So that** I can strategically reject low-paying orders without anxiety about dropping below the 70% Platinum threshold.

## Acceptance Criteria

1. **Given** I open the Tier Calculator, **When** I enter my current Acceptance Rate (e.g., 74%), **Then** I see how many orders I can decline and stay above 70%

2. **Given** I want to target a different tier, **When** I select Gold (50%) or Platinum (70%), **Then** the calculation updates to show my decline budget for that threshold

3. **Given** I enter an invalid AR (negative, over 100%, or non-numeric), **When** I try to calculate, **Then** I see a validation error and the form does not submit

4. **Given** I have calculated my decline budget, **When** I view the results, **Then** I see a clear breakdown showing current AR, target threshold, and exact number of declines remaining

5. **Given** I want to track my AR over time, **When** I save my current AR, **Then** it is stored locally and I can view my AR history

## Prerequisites

- None (standalone feature, no backend required)

## Tasks / Subtasks

- [ ] Task 1: Create Calculator UI Screen (AC: 1, 4)
  - [ ] Create `app/tier-calculator.tsx` screen
  - [ ] Add numeric input for current Acceptance Rate (%)
  - [ ] Add "Calculate" button
  - [ ] Display results card with decline budget breakdown
  - [ ] Style consistent with app dark theme

- [ ] Task 2: Implement Calculation Logic (AC: 1, 2, 4)
  - [ ] Create `src/utils/tierCalculator.ts` utility
  - [ ] Implement `calculateDeclineBudget(currentAR, targetThreshold, rollingWindow)` function
  - [ ] Handle edge cases (already below threshold, exactly at threshold)
  - [ ] Return structured result with breakdown details

- [ ] Task 3: Add Tier Threshold Selector (AC: 2)
  - [ ] Add segmented control or dropdown for tier selection
  - [ ] Options: Platinum (70%), Gold (50%), Custom
  - [ ] Update calculation when tier changes
  - [ ] Show tier benefits/description for context

- [ ] Task 4: Add Input Validation (AC: 3)
  - [ ] Validate AR is between 0-100
  - [ ] Validate AR is a valid number
  - [ ] Show inline error messages
  - [ ] Disable calculate button when invalid

- [ ] Task 5: Add AR History Tracking (AC: 5)
  - [ ] Create storage functions in `src/utils/arHistory.ts`
  - [ ] Store AR entries with timestamp in AsyncStorage
  - [ ] Add "Save AR" button after calculation
  - [ ] Display mini history chart or list (last 7 entries)
  - [ ] Show trend indicator (improving/declining)

- [ ] Task 6: Add Entry Point + Navigation (AC: 1)
  - [ ] Add route to `_layout.tsx`
  - [ ] Add card/button on Dashboard to access Tier Calculator
  - [ ] Use appropriate icon (calculator, chart, or shield)

- [ ] Task 7: Add Unit Tests (AC: 1, 2, 3)
  - [ ] Test calculateDeclineBudget with various AR values
  - [ ] Test edge cases (0%, 100%, exactly at threshold)
  - [ ] Test validation logic
  - [ ] Test AR history storage/retrieval

## Dev Notes

### Core Concept: The Decline Budget

DoorDash uses a rolling window of your last 100 orders to calculate Acceptance Rate. The math:

```
Acceptance Rate = (Accepted Orders / Total Orders) × 100

If AR = 74% on last 100 orders:
- Accepted: 74
- Declined: 26

To stay at 70% (Platinum):
- Need at least 70 accepts in next 100 orders
- Currently have 74 accepts
- Decline Budget = 74 - 70 = 4 orders
```

**Key insight:** Each new order that comes in pushes the oldest order out of the 100-order window. So if you decline the next order:
- Your 74 accepts might become 73 (if oldest order was an accept)
- Or stay at 74 (if oldest order was a decline)

For MVP, we simplify by assuming worst case: each decline reduces your accept count.

### Calculation Logic

```typescript
interface DeclineBudgetResult {
  currentAR: number;
  targetThreshold: number;
  currentAccepts: number;       // Based on 100-order window
  requiredAccepts: number;      // To stay at threshold
  declineBudget: number;        // How many you can decline
  status: 'safe' | 'warning' | 'critical';
  message: string;
}

function calculateDeclineBudget(
  currentAR: number,           // e.g., 74
  targetThreshold: number = 70, // Platinum default
  rollingWindow: number = 100   // DoorDash uses 100
): DeclineBudgetResult {

  // Calculate current accepts from AR percentage
  const currentAccepts = Math.round((currentAR / 100) * rollingWindow);

  // Calculate required accepts for target threshold
  const requiredAccepts = Math.ceil((targetThreshold / 100) * rollingWindow);

  // Decline budget is the difference
  const declineBudget = Math.max(0, currentAccepts - requiredAccepts);

  // Determine status
  let status: 'safe' | 'warning' | 'critical';
  if (declineBudget >= 5) {
    status = 'safe';
  } else if (declineBudget >= 2) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  // Generate message
  let message: string;
  if (declineBudget === 0) {
    message = `You're at the threshold. Accept your next order to build buffer.`;
  } else if (declineBudget === 1) {
    message = `You can decline 1 more order. Be selective!`;
  } else {
    message = `You can decline ${declineBudget} orders and stay ${targetThreshold >= 70 ? 'Platinum' : 'Gold'}.`;
  }

  return {
    currentAR,
    targetThreshold,
    currentAccepts,
    requiredAccepts,
    declineBudget,
    status,
    message,
  };
}
```

### Example Calculations

| Current AR | Target | Current Accepts | Required | Decline Budget | Status |
|------------|--------|-----------------|----------|----------------|--------|
| 74% | 70% | 74 | 70 | 4 | Safe |
| 71% | 70% | 71 | 70 | 1 | Critical |
| 70% | 70% | 70 | 70 | 0 | Critical |
| 68% | 70% | 68 | 70 | 0 (below!) | Critical |
| 85% | 70% | 85 | 70 | 15 | Safe |
| 55% | 50% | 55 | 50 | 5 | Safe |

### DoorDash Tier Thresholds

| Tier | Acceptance Rate | Key Benefits |
|------|-----------------|--------------|
| Platinum | 70%+ | Priority access, higher-paying orders |
| Gold | 50%+ | Some priority access |
| None | <50% | Standard access |

### Data Flow: Using the Calculator

```
Driver checks DoorDash app
        ↓
Sees their current AR: 74%
        ↓
Opens Giglet Tier Calculator
        ↓
Enters "74" in AR input
        ↓
Selects target: Platinum (70%)
        ↓
Taps "Calculate"
        ↓
Sees result:
┌─────────────────────────────────┐
│  ✅ You're Safe                 │
│                                 │
│  Decline Budget: 4 orders       │
│                                 │
│  Current AR: 74%                │
│  Target: 70% (Platinum)         │
│  Accepts: 74 of 100             │
│  Required: 70 of 100            │
│                                 │
│  You can decline 4 more orders  │
│  and stay Platinum.             │
│                                 │
│  [Save AR] [Calculate Again]    │
└─────────────────────────────────┘
        ↓
Driver confidently declines a $4 order
```

### AR History Storage

```typescript
interface ARHistoryEntry {
  ar: number;
  timestamp: string;  // ISO date
  tier: 'platinum' | 'gold' | 'none';
}

// Store in AsyncStorage
const AR_HISTORY_KEY = '@giglet/ar_history';

// Keep last 30 entries
const MAX_HISTORY_ENTRIES = 30;

async function saveAREntry(ar: number): Promise<void> {
  const history = await getARHistory();
  history.unshift({
    ar,
    timestamp: new Date().toISOString(),
    tier: ar >= 70 ? 'platinum' : ar >= 50 ? 'gold' : 'none',
  });

  // Trim to max entries
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.pop();
  }

  await AsyncStorage.setItem(AR_HISTORY_KEY, JSON.stringify(history));
}

async function getARHistory(): Promise<ARHistoryEntry[]> {
  const data = await AsyncStorage.getItem(AR_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}
```

### UI Mockup

```
┌─────────────────────────────────┐
│  📊 Tier Calculator             │
│  Manage your acceptance rate    │
├─────────────────────────────────┤
│                                 │
│  Current Acceptance Rate        │
│  ┌─────────────────────────┐    │
│  │  74  │ %                │    │
│  └─────────────────────────┘    │
│                                 │
│  Target Tier                    │
│  ┌──────────┬──────────┐        │
│  │ Platinum │   Gold   │        │
│  │   70%    │   50%    │        │
│  └──────────┴──────────┘        │
│                                 │
│  ┌─────────────────────────┐    │
│  │      Calculate          │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│  Result                         │
│  ┌─────────────────────────┐    │
│  │  ✅ SAFE                │    │
│  │                         │    │
│  │  Decline Budget         │    │
│  │  ████████░░  4 orders   │    │
│  │                         │    │
│  │  74% → 70% threshold    │    │
│  │  74 accepts / 70 needed │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  💾 Save to History     │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│  Your AR History                │
│  ┌─────────────────────────┐    │
│  │ 📈 Trending Up          │    │
│  │                         │    │
│  │ Today      74% ●        │    │
│  │ Yesterday  72% ●        │    │
│  │ Mon        71% ●        │    │
│  │ Sun        69% ○        │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Input Validation Rules

| Input | Valid Range | Error Message |
|-------|-------------|---------------|
| AR | 0-100 | "Enter a value between 0 and 100" |
| AR | Numeric only | "Please enter a valid number" |
| AR | Required | "Enter your current acceptance rate" |

### Status Colors

| Status | Condition | Color | Icon |
|--------|-----------|-------|------|
| Safe | Budget ≥ 5 | Green (#22C55E) | ✅ |
| Warning | Budget 2-4 | Yellow (#EAB308) | ⚠️ |
| Critical | Budget 0-1 | Red (#EF4444) | 🚨 |

### Manual Input Note

Since we don't have DoorDash API integration, the driver must manually check their AR in the DoorDash app and enter it here. The UI should make this clear:

> "Check your Acceptance Rate in the DoorDash app under 'Ratings', then enter it below."

### Future Enhancements

- DoorDash account linking (if API becomes available)
- Predictive suggestions: "Based on your pattern, decline rate increases on Tuesdays"
- Push reminder: "Your saved AR is 3 days old. Time to update?"
- Goal setting: "I want to reach 80% by Friday"
- Order acceptance tracking within Giglet

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-03 | 1.0 | Story drafted |
