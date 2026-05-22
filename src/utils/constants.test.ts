import { normalizeAsset, areTypesEquivalent } from './constants';

describe('Constants and Utils', () => {
  describe('normalizeAsset', () => {
    it('should map known aliases correctly', () => {
      expect(normalizeAsset('bitcoin')).toBe('BTC');
      expect(normalizeAsset('BTC')).toBe('BTC');
      expect(normalizeAsset('Ethereum ')).toBe('ETH');
      expect(normalizeAsset('eth')).toBe('ETH');
    });

    it('should fallback to uppercase if no alias found', () => {
      expect(normalizeAsset('solana')).toBe('SOLANA');
      expect(normalizeAsset(' ADA ')).toBe('ADA');
    });
  });

  describe('areTypesEquivalent', () => {
    it('should match exact types', () => {
      expect(areTypesEquivalent('BUY', 'BUY')).toBe(true);
      expect(areTypesEquivalent('TRANSFER_IN', 'transfer_in')).toBe(true);
    });

    it('should match equivalent types', () => {
      expect(areTypesEquivalent('TRANSFER_IN', 'TRANSFER_OUT')).toBe(true);
      expect(areTypesEquivalent('WITHDRAWAL', 'TRANSFER_OUT')).toBe(true);
      expect(areTypesEquivalent('DEPOSIT', 'TRANSFER_IN')).toBe(true);
    });

    it('should not match unrelated types', () => {
      expect(areTypesEquivalent('BUY', 'SELL')).toBe(false);
      expect(areTypesEquivalent('DEPOSIT', 'WITHDRAWAL')).toBe(false);
    });
  });
});
