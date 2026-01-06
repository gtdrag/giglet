import { TipSize, TipLog, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { getTipSizesAbove } from '../schemas/tips.schema';

export interface CreateTipLogData {
  lat: number;
  lng: number;
  tipSize: TipSize;
}

export interface QueryTipsFilters {
  tipSize?: TipSize;
  startDate?: string;
  endDate?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  limit?: number;
  offset?: number;
}

export interface QueryTipsResult {
  tips: TipLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class TipsService {
  /**
   * Create a new tip log entry
   * @param userId User ID
   * @param data Tip log data (lat, lng, tipSize)
   */
  async createTipLog(userId: string, data: CreateTipLogData): Promise<TipLog> {
    logger.debug('Creating tip log', {
      userId,
      lat: data.lat,
      lng: data.lng,
      tipSize: data.tipSize,
    });

    const tipLog = await prisma.tipLog.create({
      data: {
        userId,
        lat: data.lat,
        lng: data.lng,
        tipSize: data.tipSize,
      },
    });

    logger.info('Tip log created', {
      tipLogId: tipLog.id,
      userId,
      tipSize: data.tipSize,
    });

    return tipLog;
  }

  /**
   * Query tip logs for a user with optional filters
   * @param userId User ID
   * @param filters Optional filters (tipSize, date range, viewport bounds, pagination)
   */
  async queryTips(userId: string, filters: QueryTipsFilters = {}): Promise<QueryTipsResult> {
    const {
      tipSize,
      startDate,
      endDate,
      minLat,
      maxLat,
      minLng,
      maxLng,
      limit = 50,
      offset = 0,
    } = filters;

    logger.debug('Querying tips', { userId, filters });

    // Build where clause
    const where: Prisma.TipLogWhereInput = {
      userId,
    };

    // TipSize filter - hierarchical (returns specified size and above)
    if (tipSize) {
      const validSizes = getTipSizesAbove(tipSize);
      where.tipSize = { in: validSizes };
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date by setting to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    // Viewport bounds filter
    if (minLat !== undefined && maxLat !== undefined &&
        minLng !== undefined && maxLng !== undefined) {
      where.lat = { gte: minLat, lte: maxLat };
      where.lng = { gte: minLng, lte: maxLng };
    }

    // Execute count and query in parallel
    const [total, tips] = await Promise.all([
      prisma.tipLog.count({ where }),
      prisma.tipLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    logger.debug('Tips query result', {
      userId,
      total,
      returned: tips.length,
      limit,
      offset,
    });

    return {
      tips,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tips.length < total,
      },
    };
  }
}

export const tipsService = new TipsService();
