export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calculateDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(destination.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateBidSuccessProbability(
  bidAmount: number,
  currentBestBid?: number,
  marketAverage?: number
): number {
  if (!currentBestBid && !marketAverage) {
    return 50; // Default probability when no data
  }

  const reference = currentBestBid || marketAverage || 0;
  const percentageDiff = ((bidAmount - reference) / reference) * 100;

  // Lower bid = higher probability
  if (percentageDiff <= -10) return 95;
  if (percentageDiff <= -5) return 80;
  if (percentageDiff <= 0) return 65;
  if (percentageDiff <= 5) return 45;
  if (percentageDiff <= 10) return 25;
  return 10;
}

export function generateLockFee(bidAmount: number, duration: '24h' | '48h'): number {
  const baseRate = duration === '24h' ? 0.01 : 0.015; // 1% for 24h, 1.5% for 48h
  return Math.max(25, bidAmount * baseRate); // Minimum $25 fee
}

export function getEquipmentLabel(type: string): string {
  const labels: Record<string, string> = {
    dry_van: 'Dry Van',
    reefer: 'Refrigerated',
    flatbed: 'Flatbed',
    step_deck: 'Step Deck',
    rgn: 'RGN',
    power_only: 'Power Only',
  };
  return labels[type] || type;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'gray',
    active: 'green',
    pending: 'yellow',
    awarded: 'blue',
    completed: 'purple',
    cancelled: 'red',
  };
  return colors[status] || 'gray';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}