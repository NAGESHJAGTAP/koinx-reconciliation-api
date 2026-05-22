export const ASSET_ALIASES: Record<string, string> = {
  'bitcoin': 'BTC',
  'btc': 'BTC',
  'ethereum': 'ETH',
  'eth': 'ETH',
  'tether': 'USDT',
  'usdt': 'USDT',
  // Can add more aliases as needed.
};

export const normalizeAsset = (asset: string): string => {
  const lower = asset.trim().toLowerCase();
  return ASSET_ALIASES[lower] || asset.trim().toUpperCase();
};

export const TYPE_EQUIVALENTS: Record<string, string[]> = {
  'TRANSFER_IN': ['TRANSFER_IN', 'TRANSFER_OUT', 'DEPOSIT', 'WITHDRAWAL'],
  'TRANSFER_OUT': ['TRANSFER_OUT', 'TRANSFER_IN', 'WITHDRAWAL', 'DEPOSIT'],
  'DEPOSIT': ['DEPOSIT', 'TRANSFER_IN'],
  'WITHDRAWAL': ['WITHDRAWAL', 'TRANSFER_OUT'],
  'BUY': ['BUY'],
  'SELL': ['SELL'],
  'TRADE': ['TRADE']
};

export const areTypesEquivalent = (type1: string, type2: string): boolean => {
  const t1 = type1.trim().toUpperCase();
  const t2 = type2.trim().toUpperCase();
  
  if (t1 === t2) return true;
  
  if (TYPE_EQUIVALENTS[t1] && TYPE_EQUIVALENTS[t1].includes(t2)) {
    return true;
  }
  return false;
};
