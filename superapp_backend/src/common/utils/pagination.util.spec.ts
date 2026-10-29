import {
  buildPaginationMeta,
  createPaginatedResponse,
} from './pagination.util';

describe('Pagination Utilities', () => {
  describe('buildPaginationMeta', () => {
    it('calculates page 1 of 5 correctly', () => {
      const meta = buildPaginationMeta(100, 1, 20);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('calculates last page correctly', () => {
      const meta = buildPaginationMeta(100, 5, 20);
      expect(meta).toEqual({
        page: 5,
        limit: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('handles non-exact page divisions', () => {
      const meta = buildPaginationMeta(105, 3, 20);
      expect(meta.totalPages).toBe(6);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPreviousPage).toBe(true);
    });

    it('handles empty results (0 items)', () => {
      const meta = buildPaginationMeta(0, 1, 20);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('sanitizes invalid page and limit inputs', () => {
      const meta = buildPaginationMeta(50, -5, 0);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(20);
      expect(meta.totalPages).toBe(3);
    });
  });

  describe('createPaginatedResponse', () => {
    it('wraps data in standard envelope', () => {
      const sample = [{ id: '1', name: 'App A' }];
      const res = createPaginatedResponse(sample, 55, 2, 10);
      expect(res.success).toBe(true);
      expect(res.data).toEqual(sample);
      expect(res.meta.page).toBe(2);
      expect(res.meta.totalPages).toBe(6);
      expect(res.meta.hasNextPage).toBe(true);
    });
  });
});
