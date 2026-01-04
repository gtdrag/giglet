/**
 * Trip formatting utility functions
 * Extracted to avoid react-native dependencies for easier testing
 */

/**
 * Format date as "Mon, Jan 6" (short weekday, month, day)
 */
export const formatTripDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format time as "2:30 PM" (12-hour format with AM/PM)
 */
export const formatTripTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format time range as "2:30 PM - 3:15 PM"
 */
export const formatTimeRange = (startedAt: string, endedAt: string): string => {
  return `${formatTripTime(startedAt)} - ${formatTripTime(endedAt)}`;
};
