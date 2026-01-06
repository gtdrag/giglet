/**
 * Unit tests for Share Service
 * Story 7-5: Export Share and Email
 * Tests share sheet integration via expo-sharing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock expo-sharing
const mockIsAvailableAsync = vi.fn();
const mockShareAsync = vi.fn();

vi.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (uri: string, options?: object) => mockShareAsync(uri, options),
}));

// Mock expo-file-system
const mockGetInfoAsync = vi.fn();

vi.mock('expo-file-system', () => ({
  getInfoAsync: (path: string) => mockGetInfoAsync(path),
}));

// Import after mocks are set up
import { shareFile, isSharingAvailable, getExportMimeType } from '../share';

describe('Share Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to sharing available and file exists
    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockShareAsync.mockResolvedValue(undefined);
  });

  describe('isSharingAvailable', () => {
    it('should return true when sharing is available', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);

      const result = await isSharingAvailable();

      expect(result).toBe(true);
      expect(mockIsAvailableAsync).toHaveBeenCalled();
    });

    it('should return false when sharing is not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      const result = await isSharingAvailable();

      expect(result).toBe(false);
      expect(mockIsAvailableAsync).toHaveBeenCalled();
    });
  });

  describe('shareFile', () => {
    it('should return error when sharing is not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      const result = await shareFile('/path/to/file.csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sharing is not available on this device');
      expect(mockShareAsync).not.toHaveBeenCalled();
    });

    it('should return error when file does not exist', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: false });

      const result = await shareFile('/path/to/nonexistent.csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(mockShareAsync).not.toHaveBeenCalled();
    });

    it('should call shareAsync with correct parameters when file exists', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockShareAsync.mockResolvedValue(undefined);

      const filePath = '/path/to/mileage.csv';
      const mimeType = 'text/csv';

      const result = await shareFile(filePath, mimeType);

      expect(result.success).toBe(true);
      expect(mockShareAsync).toHaveBeenCalledWith(filePath, {
        mimeType,
        dialogTitle: 'Share Mileage Log',
      });
    });

    it('should call shareAsync without mimeType when not provided', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockShareAsync.mockResolvedValue(undefined);

      const filePath = '/path/to/file.pdf';

      const result = await shareFile(filePath);

      expect(result.success).toBe(true);
      expect(mockShareAsync).toHaveBeenCalledWith(filePath, {
        mimeType: undefined,
        dialogTitle: 'Share Mileage Log',
      });
    });

    it('should return error when shareAsync throws', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockShareAsync.mockRejectedValue(new Error('Share sheet dismissed'));

      const result = await shareFile('/path/to/file.csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Share sheet dismissed');
    });

    it('should handle non-Error exceptions gracefully', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockShareAsync.mockRejectedValue('Unknown error');

      const result = await shareFile('/path/to/file.csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to share file');
    });
  });

  describe('getExportMimeType', () => {
    it('should return text/csv for csv format', () => {
      const mimeType = getExportMimeType('csv');

      expect(mimeType).toBe('text/csv');
    });

    it('should return application/pdf for pdf format', () => {
      const mimeType = getExportMimeType('pdf');

      expect(mimeType).toBe('application/pdf');
    });

    it('should return application/octet-stream for unknown format', () => {
      // TypeScript would normally prevent this, but testing runtime behavior
      const mimeType = getExportMimeType('unknown' as 'csv' | 'pdf');

      expect(mimeType).toBe('application/octet-stream');
    });
  });

  describe('Integration scenarios', () => {
    it('should support CSV export sharing flow', async () => {
      const csvPath = '/cache/mileage-2024.csv';
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockShareAsync.mockResolvedValue(undefined);

      const mimeType = getExportMimeType('csv');
      const result = await shareFile(csvPath, mimeType);

      expect(mimeType).toBe('text/csv');
      expect(result.success).toBe(true);
      expect(mockShareAsync).toHaveBeenCalledWith(csvPath, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Mileage Log',
      });
    });

    it('should support PDF export sharing flow', async () => {
      const pdfPath = '/cache/mileage-2024.pdf';
      mockIsAvailableAsync.mockResolvedValue(true);
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockShareAsync.mockResolvedValue(undefined);

      const mimeType = getExportMimeType('pdf');
      const result = await shareFile(pdfPath, mimeType);

      expect(mimeType).toBe('application/pdf');
      expect(result.success).toBe(true);
      expect(mockShareAsync).toHaveBeenCalledWith(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Mileage Log',
      });
    });
  });
});
