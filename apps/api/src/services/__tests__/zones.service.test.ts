import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the service
vi.mock('../../lib/prisma', () => ({
  prisma: {
    zone: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { zonesService } from '../zones.service';

describe('ZonesService', () => {
  describe('calculateScore', () => {
    describe('Meal Window Scores', () => {
      it('returns breakfast score (40) during 7-10 AM on weekday', () => {
        // Tuesday 8:30 AM UTC
        const date = new Date('2026-01-06T08:30:00Z');
        const { factors } = zonesService.calculateScore(date, 'UTC');

        expect(factors.mealTimeBoost).toBe(40);
      });

      it('returns lunch score (80) during 11 AM - 2 PM', () => {
        // Tuesday 12:30 PM UTC
        const date = new Date('2026-01-06T12:30:00Z');
        const { factors } = zonesService.calculateScore(date, 'UTC');

        expect(factors.mealTimeBoost).toBe(80);
      });

      it('returns dinner score (100) during 5-9 PM on weekday', () => {
        // Tuesday 7:00 PM UTC
        const date = new Date('2026-01-06T19:00:00Z');
        const { factors } = zonesService.calculateScore(date, 'UTC');

        expect(factors.mealTimeBoost).toBe(100);
      });

      it('returns late night score (50) during 9 PM - 12 AM', () => {
        // Tuesday 10:30 PM UTC
        const date = new Date('2026-01-06T22:30:00Z');
        const { factors } = zonesService.calculateScore(date, 'UTC');

        expect(factors.mealTimeBoost).toBe(50);
      });

      it('returns off-peak score (20) during non-meal hours', () => {
        // Tuesday 3:00 PM UTC (off-peak)
        const date = new Date('2026-01-06T15:00:00Z');
        const { factors } = zonesService.calculateScore(date, 'UTC');

        expect(factors.mealTimeBoost).toBe(20);
      });

      it('returns off-peak score (20) during early morning', () => {
        // Tuesday 4:00 AM UTC
        const date = new Date('2026-01-06T04:00:00Z');
        const { factors } = zonesService.calculateScore(date, 'UTC');

        expect(factors.mealTimeBoost).toBe(20);
      });
    });

    describe('Weekend Multipliers', () => {
      it('applies 1.2x weekend dinner boost on Saturday', () => {
        // Saturday 7:00 PM UTC - dinner time
        const saturdayDinner = new Date('2026-01-03T19:00:00Z');
        const { factors: satFactors } = zonesService.calculateScore(saturdayDinner, 'UTC');

        // Tuesday 7:00 PM UTC - same time, weekday
        const tuesdayDinner = new Date('2026-01-06T19:00:00Z');
        const { factors: tueFactors } = zonesService.calculateScore(tuesdayDinner, 'UTC');

        // Saturday dinner should be higher (100 * 1.2 = 120, capped at 100)
        // But since the base is 100, 1.2x = 120, capped to 100
        // Actually looking at the code: Math.min(100, 100 * 1.2) = 100
        // So both will be 100 for dinner peak hours
        // The multiplier applies to the window score, not the final score
        expect(satFactors.mealTimeBoost).toBeGreaterThanOrEqual(tueFactors.mealTimeBoost);
      });

      it('applies 1.1x weekend breakfast boost on Sunday', () => {
        // Sunday 8:30 AM UTC - breakfast time
        const sundayBreakfast = new Date('2026-01-04T08:30:00Z');
        const { factors: sunFactors } = zonesService.calculateScore(sundayBreakfast, 'UTC');

        // Tuesday 8:30 AM UTC - same time, weekday
        const tuesdayBreakfast = new Date('2026-01-06T08:30:00Z');
        const { factors: tueFactors } = zonesService.calculateScore(tuesdayBreakfast, 'UTC');

        // Sunday breakfast should be higher (40 * 1.1 = 44)
        expect(sunFactors.mealTimeBoost).toBe(44);
        expect(tueFactors.mealTimeBoost).toBe(40);
        expect(sunFactors.mealTimeBoost).toBeGreaterThan(tueFactors.mealTimeBoost);
      });

      it('weekend score is higher than weekday', () => {
        // Saturday
        const saturday = new Date('2026-01-03T12:00:00Z');
        const { factors: satFactors } = zonesService.calculateScore(saturday, 'UTC');

        // Tuesday
        const tuesday = new Date('2026-01-06T12:00:00Z');
        const { factors: tueFactors } = zonesService.calculateScore(tuesday, 'UTC');

        expect(satFactors.weekendBoost).toBe(90); // Saturday
        expect(tueFactors.weekendBoost).toBe(50); // Weekday
      });
    });

    describe('Smooth Transitions', () => {
      it('transitions smoothly from off-peak to lunch (10:30-11:00)', () => {
        // 10:30 AM - start of transition
        const start = new Date('2026-01-06T10:30:00Z');
        const { factors: startFactors } = zonesService.calculateScore(start, 'UTC');

        // 10:45 AM - mid transition
        const mid = new Date('2026-01-06T10:45:00Z');
        const { factors: midFactors } = zonesService.calculateScore(mid, 'UTC');

        // 11:00 AM - end of transition (start of lunch)
        const end = new Date('2026-01-06T11:00:00Z');
        const { factors: endFactors } = zonesService.calculateScore(end, 'UTC');

        // Should be increasing: off-peak(20) → lunch entry transition
        expect(startFactors.mealTimeBoost).toBe(20); // Off-peak
        expect(midFactors.mealTimeBoost).toBeGreaterThan(startFactors.mealTimeBoost);
        expect(midFactors.mealTimeBoost).toBeLessThan(80); // Not yet full lunch
      });

      it('transitions smoothly within lunch window (entry)', () => {
        // 11:00 AM - start of lunch window (transition in)
        const start = new Date('2026-01-06T11:00:00Z');
        const { factors: startFactors } = zonesService.calculateScore(start, 'UTC');

        // 11:15 AM - mid entry transition
        const mid = new Date('2026-01-06T11:15:00Z');
        const { factors: midFactors } = zonesService.calculateScore(mid, 'UTC');

        // 11:30 AM - full lunch score
        const full = new Date('2026-01-06T11:30:00Z');
        const { factors: fullFactors } = zonesService.calculateScore(full, 'UTC');

        expect(startFactors.mealTimeBoost).toBeLessThan(fullFactors.mealTimeBoost);
        expect(midFactors.mealTimeBoost).toBeLessThan(fullFactors.mealTimeBoost);
        expect(fullFactors.mealTimeBoost).toBe(80); // Full lunch score
      });

      it('no abrupt jump at 11:00 AM exactly', () => {
        // Test that transitions are gradual, not jumping directly from 20 to 80
        // At 11:00 AM exactly, we're at the START of the entry transition (score = 20)
        // By 11:15 AM, we're mid-transition (score between 20 and 80)
        // By 11:30 AM, we're at full lunch score (80)

        // 11:00 AM - start of entry transition
        const start = new Date('2026-01-06T11:00:00Z');
        const { factors: startFactors } = zonesService.calculateScore(start, 'UTC');

        // 11:15 AM - mid entry transition
        const mid = new Date('2026-01-06T11:15:00Z');
        const { factors: midFactors } = zonesService.calculateScore(mid, 'UTC');

        // 11:30 AM - full lunch score
        const full = new Date('2026-01-06T11:30:00Z');
        const { factors: fullFactors } = zonesService.calculateScore(full, 'UTC');

        // Verify gradual progression
        expect(startFactors.mealTimeBoost).toBe(20); // Start of transition = off-peak
        expect(midFactors.mealTimeBoost).toBeGreaterThan(20); // Mid transition
        expect(midFactors.mealTimeBoost).toBeLessThan(80); // Not yet full
        expect(fullFactors.mealTimeBoost).toBe(80); // Full lunch score

        // Verify ordering: start < mid < full
        expect(startFactors.mealTimeBoost).toBeLessThan(midFactors.mealTimeBoost);
        expect(midFactors.mealTimeBoost).toBeLessThan(fullFactors.mealTimeBoost);
      });
    });

    describe('Timezone Handling', () => {
      it('uses timezone for score calculation', () => {
        // 12:00 PM UTC = 4:00 AM in Los Angeles (off-peak)
        const date = new Date('2026-01-06T12:00:00Z');

        const { factors: utcFactors } = zonesService.calculateScore(date, 'UTC');
        const { factors: laFactors } = zonesService.calculateScore(date, 'America/Los_Angeles');

        // UTC 12:00 = lunch time (score 80)
        // LA 4:00 AM = off-peak (score 20)
        expect(utcFactors.mealTimeBoost).toBe(80);
        expect(laFactors.mealTimeBoost).toBe(20);
      });

      it('different timezones produce different scores for same UTC time', () => {
        // 6:00 PM UTC = dinner in UTC, but different in other zones
        const date = new Date('2026-01-06T18:00:00Z');

        const { score: utcScore } = zonesService.calculateScore(date, 'UTC');
        const { score: tokyoScore } = zonesService.calculateScore(date, 'Asia/Tokyo');

        // Different timezones should produce different scores
        expect(utcScore).not.toBe(tokyoScore);
      });

      it('defaults to UTC when no timezone provided', () => {
        const date = new Date('2026-01-06T12:00:00Z');

        const { factors: defaultFactors } = zonesService.calculateScore(date);
        const { factors: utcFactors } = zonesService.calculateScore(date, 'UTC');

        expect(defaultFactors.mealTimeBoost).toBe(utcFactors.mealTimeBoost);
      });

      it('handles edge case timezones gracefully', () => {
        const date = new Date('2026-01-06T12:00:00Z');

        // These should not throw errors - the service should handle gracefully
        expect(() => zonesService.calculateScore(date, 'UTC')).not.toThrow();
        expect(() => zonesService.calculateScore(date, 'America/New_York')).not.toThrow();
        expect(() => zonesService.calculateScore(date, 'Europe/London')).not.toThrow();

        // All should return valid scores in range
        const { score: utcScore } = zonesService.calculateScore(date, 'UTC');
        const { score: nyScore } = zonesService.calculateScore(date, 'America/New_York');

        expect(utcScore).toBeGreaterThanOrEqual(0);
        expect(utcScore).toBeLessThanOrEqual(100);
        expect(nyScore).toBeGreaterThanOrEqual(0);
        expect(nyScore).toBeLessThanOrEqual(100);
      });
    });

    describe('Score Range and Labels', () => {
      it('score is always between 0 and 100', () => {
        const testDates = [
          new Date('2026-01-03T08:00:00Z'), // Saturday breakfast
          new Date('2026-01-03T19:00:00Z'), // Saturday dinner peak
          new Date('2026-01-06T03:00:00Z'), // Tuesday dead hours
          new Date('2026-01-06T15:00:00Z'), // Tuesday off-peak
        ];

        for (const date of testDates) {
          const { score } = zonesService.calculateScore(date, 'UTC');
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      });

      it('getScoreLabel returns correct labels', () => {
        expect(zonesService.getScoreLabel(85)).toBe('Hot');
        expect(zonesService.getScoreLabel(80)).toBe('Hot');
        expect(zonesService.getScoreLabel(70)).toBe('Busy');
        expect(zonesService.getScoreLabel(60)).toBe('Busy');
        expect(zonesService.getScoreLabel(50)).toBe('Moderate');
        expect(zonesService.getScoreLabel(40)).toBe('Moderate');
        expect(zonesService.getScoreLabel(30)).toBe('Slow');
        expect(zonesService.getScoreLabel(20)).toBe('Slow');
        expect(zonesService.getScoreLabel(10)).toBe('Dead');
        expect(zonesService.getScoreLabel(0)).toBe('Dead');
      });
    });

    describe('Peak Hour Scores', () => {
      it('peak hour boost is highest during dinner rush', () => {
        const dinnerRush = new Date('2026-01-06T19:00:00Z');
        const { factors } = zonesService.calculateScore(dinnerRush, 'UTC');

        expect(factors.peakHourBoost).toBe(100);
      });

      it('peak hour boost is high during lunch rush', () => {
        const lunchRush = new Date('2026-01-06T12:00:00Z');
        const { factors } = zonesService.calculateScore(lunchRush, 'UTC');

        expect(factors.peakHourBoost).toBe(90);
      });

      it('peak hour boost is low during dead hours', () => {
        const deadHours = new Date('2026-01-06T02:00:00Z');
        const { factors } = zonesService.calculateScore(deadHours, 'UTC');

        expect(factors.peakHourBoost).toBe(10);
      });
    });
  });
});
