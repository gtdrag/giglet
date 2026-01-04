import { Platform, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export type EarningsPeriod = 'today' | 'week' | 'month' | 'year';

export interface PlatformBreakdown {
  platform: Platform;
  total: number;
  tipTotal: number;
  basePayTotal: number;
  deliveryCount: number;
}

export interface EarningsSummary {
  period: EarningsPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  total: number;
  tipTotal: number;
  basePayTotal: number;
  deliveryCount: number;
  platformBreakdown: PlatformBreakdown[];
}

class EarningsService {
  /**
   * Get earnings summary for a user
   * @param userId User ID
   * @param period Time period (today, week, month, year)
   * @param timezone User's timezone (e.g., "America/New_York")
   */
  async getEarningsSummary(
    userId: string,
    period: EarningsPeriod = 'today',
    timezone: string = 'UTC'
  ): Promise<EarningsSummary> {
    const { start, end } = this.getDateRange(period, timezone);

    logger.debug('Fetching earnings summary', {
      userId,
      period,
      timezone,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    // Query deliveries with aggregation
    const deliveries = await prisma.delivery.groupBy({
      by: ['platform'],
      where: {
        userId,
        deliveredAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        earnings: true,
        tip: true,
        basePay: true,
      },
      _count: {
        id: true,
      },
    });

    // Build platform breakdown
    const platformBreakdown: PlatformBreakdown[] = deliveries.map((d) => ({
      platform: d.platform,
      total: d._sum.earnings?.toNumber() ?? 0,
      tipTotal: d._sum.tip?.toNumber() ?? 0,
      basePayTotal: d._sum.basePay?.toNumber() ?? 0,
      deliveryCount: d._count.id,
    }));

    // Calculate totals
    const total = platformBreakdown.reduce((sum, p) => sum + p.total, 0);
    const tipTotal = platformBreakdown.reduce((sum, p) => sum + p.tipTotal, 0);
    const basePayTotal = platformBreakdown.reduce((sum, p) => sum + p.basePayTotal, 0);
    const deliveryCount = platformBreakdown.reduce((sum, p) => sum + p.deliveryCount, 0);

    return {
      period,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      total,
      tipTotal,
      basePayTotal,
      deliveryCount,
      platformBreakdown,
    };
  }

  /**
   * Get list of individual deliveries for a period
   */
  async getDeliveries(
    userId: string,
    period: EarningsPeriod = 'today',
    timezone: string = 'UTC',
    limit: number = 50,
    offset: number = 0,
    platform?: Platform
  ) {
    const { start, end } = this.getDateRange(period, timezone);

    // Build where clause with optional platform filter
    const where: Prisma.DeliveryWhereInput = {
      userId,
      deliveredAt: {
        gte: start,
        lt: end,
      },
      ...(platform && { platform }),
    };

    const [deliveries, count] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: {
          deliveredAt: 'desc',
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          platform: true,
          earnings: true,
          tip: true,
          basePay: true,
          restaurantName: true,
          deliveredAt: true,
        },
      }),
      prisma.delivery.count({
        where,
      }),
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        platform: d.platform,
        earnings: d.earnings.toNumber(),
        tip: d.tip.toNumber(),
        basePay: d.basePay.toNumber(),
        restaurantName: d.restaurantName,
        deliveredAt: d.deliveredAt.toISOString(),
      })),
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Get period comparison (current vs previous)
   */
  async getComparison(
    userId: string,
    period: EarningsPeriod = 'week',
    timezone: string = 'UTC'
  ) {
    const { start: currentStart, end: currentEnd } = this.getDateRange(period, timezone);
    const { start: previousStart, end: previousEnd } = this.getPreviousDateRange(period, timezone, currentStart, currentEnd);

    // Fetch totals for both periods in parallel
    const [currentData, previousData] = await Promise.all([
      this.getSimpleSummary(userId, currentStart, currentEnd),
      this.getSimpleSummary(userId, previousStart, previousEnd),
    ]);

    // Calculate changes
    const earningsChange = currentData.total - previousData.total;
    const earningsPercent = previousData.total > 0
      ? Math.round((earningsChange / previousData.total) * 1000) / 10
      : currentData.total > 0 ? 100 : 0;
    const deliveriesChange = currentData.deliveryCount - previousData.deliveryCount;

    return {
      current: {
        total: currentData.total,
        deliveryCount: currentData.deliveryCount,
        dateRange: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString(),
        },
      },
      previous: {
        total: previousData.total,
        deliveryCount: previousData.deliveryCount,
        dateRange: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString(),
        },
      },
      change: {
        earnings: Math.round(earningsChange * 100) / 100,
        earningsPercent,
        deliveries: deliveriesChange,
      },
      hasPreviousData: previousData.deliveryCount > 0,
    };
  }

  /**
   * Get simple summary totals for a date range
   */
  private async getSimpleSummary(userId: string, start: Date, end: Date) {
    const result = await prisma.delivery.aggregate({
      where: {
        userId,
        deliveredAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        earnings: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      total: result._sum.earnings?.toNumber() ?? 0,
      deliveryCount: result._count.id,
    };
  }

  /**
   * Calculate previous period date range
   */
  private getPreviousDateRange(
    period: EarningsPeriod,
    timezone: string,
    currentStart: Date,
    currentEnd: Date
  ): { start: Date; end: Date } {
    // Calculate duration of current period in milliseconds
    const durationMs = currentEnd.getTime() - currentStart.getTime();

    switch (period) {
      case 'today':
        // Yesterday same duration
        return {
          start: new Date(currentStart.getTime() - 24 * 60 * 60 * 1000),
          end: new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000),
        };

      case 'week':
        // Last week same duration
        return {
          start: new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(currentEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
        };

      case 'month':
        // Same dates in previous month
        const prevMonthStart = new Date(currentStart);
        prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
        const prevMonthEnd = new Date(currentEnd);
        prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);
        return {
          start: prevMonthStart,
          end: prevMonthEnd,
        };

      case 'year':
        // Same dates in previous year
        const prevYearStart = new Date(currentStart);
        prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
        const prevYearEnd = new Date(currentEnd);
        prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
        return {
          start: prevYearStart,
          end: prevYearEnd,
        };

      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  /**
   * Calculate date range for a period in user's timezone
   */
  private getDateRange(
    period: EarningsPeriod,
    timezone: string
  ): { start: Date; end: Date } {
    // Get current time in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Parse the formatted date back to get timezone-adjusted components
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

    const year = parseInt(getPart('year'));
    const month = parseInt(getPart('month')) - 1; // JS months are 0-indexed
    const day = parseInt(getPart('day'));

    // Create date in user's timezone perspective
    let start: Date;
    let end: Date;

    switch (period) {
      case 'today':
        // Start of today in user's timezone
        start = this.createDateInTimezone(year, month, day, 0, 0, 0, timezone);
        end = this.createDateInTimezone(year, month, day + 1, 0, 0, 0, timezone);
        break;

      case 'week':
        // Start of this week (Monday)
        const dayOfWeek = new Date(year, month, day).getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = this.createDateInTimezone(year, month, day - daysToMonday, 0, 0, 0, timezone);
        end = this.createDateInTimezone(year, month, day + 1, 0, 0, 0, timezone);
        break;

      case 'month':
        // Start of this month
        start = this.createDateInTimezone(year, month, 1, 0, 0, 0, timezone);
        end = this.createDateInTimezone(year, month, day + 1, 0, 0, 0, timezone);
        break;

      case 'year':
        // Start of this year
        start = this.createDateInTimezone(year, 0, 1, 0, 0, 0, timezone);
        end = this.createDateInTimezone(year, month, day + 1, 0, 0, 0, timezone);
        break;

      default:
        throw new Error(`Invalid period: ${period}`);
    }

    return { start, end };
  }

  /**
   * Create a Date object adjusted for timezone
   */
  private createDateInTimezone(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    timezone: string
  ): Date {
    // Create a date string and parse it as if it's in the target timezone
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

    // Get the offset for this timezone at this date
    const localDate = new Date(dateStr);
    const utcDate = new Date(
      localDate.toLocaleString('en-US', { timeZone: 'UTC' })
    );
    const tzDate = new Date(
      localDate.toLocaleString('en-US', { timeZone: timezone })
    );
    const offset = utcDate.getTime() - tzDate.getTime();

    return new Date(localDate.getTime() + offset);
  }

  /**
   * Get hourly rate for a period
   * Calculates earnings / active hours from trip data
   */
  async getHourlyRate(
    userId: string,
    period: EarningsPeriod = 'week',
    timezone: string = 'UTC'
  ) {
    const { start, end } = this.getDateRange(period, timezone);

    // Get total earnings for the period
    const earningsResult = await prisma.delivery.aggregate({
      where: {
        userId,
        deliveredAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        earnings: true,
      },
    });

    const totalEarnings = earningsResult._sum.earnings?.toNumber() ?? 0;

    // Get trips for the period to calculate active hours
    const trips = await prisma.trip.findMany({
      where: {
        userId,
        startedAt: {
          gte: start,
          lt: end,
        },
        endedAt: {
          not: null,
        },
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    // Calculate total active hours from trips
    let totalHours = 0;
    for (const trip of trips) {
      if (trip.endedAt) {
        const durationMs = trip.endedAt.getTime() - trip.startedAt.getTime();
        totalHours += durationMs / (1000 * 60 * 60); // Convert to hours
      }
    }

    // Round to 1 decimal place
    totalHours = Math.round(totalHours * 10) / 10;

    // Calculate hourly rate
    const hourlyRate = totalHours > 0 ? Math.round((totalEarnings / totalHours) * 100) / 100 : 0;

    // Period labels for display
    const periodLabels: Record<EarningsPeriod, string> = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
    };

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalHours,
      hourlyRate,
      periodLabel: periodLabels[period],
      hasData: trips.length > 0,
    };
  }
}

export const earningsService = new EarningsService();
