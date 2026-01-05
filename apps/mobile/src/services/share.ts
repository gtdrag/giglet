/**
 * Share Service - Native share sheet wrapper
 * Uses expo-sharing for cross-platform file sharing
 */

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface ShareResult {
  success: boolean;
  error?: string;
}

/**
 * Check if sharing is available on this device
 */
export const isSharingAvailable = async (): Promise<boolean> => {
  return await Sharing.isAvailableAsync();
};

/**
 * Share a file using the native share sheet
 * @param filePath - Local file path (URI) to share
 * @param mimeType - MIME type of the file (e.g., 'text/csv', 'application/pdf')
 * @returns ShareResult indicating success or failure
 */
export const shareFile = async (
  filePath: string,
  mimeType?: string
): Promise<ShareResult> => {
  try {
    // Check if sharing is available
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return {
        success: false,
        error: 'Sharing is not available on this device',
      };
    }

    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    // Share the file
    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: 'Share Mileage Log',
    });

    return { success: true };
  } catch (error) {
    console.error('[Share] Error sharing file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share file',
    };
  }
};

/**
 * Get MIME type for export file formats
 */
export const getExportMimeType = (format: 'csv' | 'pdf'): string => {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};
