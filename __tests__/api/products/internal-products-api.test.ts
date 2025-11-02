import { GET } from '@/app/api/v1/get/our-products/all-data/route';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    products: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    categories: {
      findMany: jest.fn(),
    },
  },
}));

// ✅ FIXED: Properly mock NextResponse.json to respect the status option
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      const status = options?.status || 200;
      return {
        json: async () => data,
        text: async () => typeof data === 'string' ? data : JSON.stringify(data),
        status: status,
      };
    }),
  },
}));

describe('GET /api/v1/get/our-products/all-data', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Internal Tools' },
    { id: 'cat-2', name: 'Public Platforms' },
    { id: 'cat-3', name: 'Automation Systems' },
  ];

  const mockProducts = [
    {
      id: 'prod-1',
      title: 'HR Portal',
      status: 'ACTIVE',
      url: 'https://hr.example.com',
      icon: null,
      image: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      categories: [{ id: 'cat-1', name: 'Internal Tools', description: 'Internal tools' }],
    },
    {
      id: 'prod-2',
      title: 'Public Site',
      status: 'ACTIVE',
      url: 'https://public.example.com',
      icon: null,
      image: null,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      categories: [{ id: 'cat-2', name: 'Public Platforms', description: 'Public platforms' }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_KEY = 'test-api-key-12345';
    (db.categories.findMany as jest.Mock).mockResolvedValue(mockCategories);
    (db.products.count as jest.Mock).mockResolvedValue(2);
    (db.products.findMany as jest.Mock).mockResolvedValue(mockProducts);
  });

  const createRequest = (url: string, apiKey?: string) => {
    const headers = new Headers();
    if (apiKey !== undefined) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
    return new Request(url, { headers, method: 'GET' });
  };

  describe('Authentication Tests', () => {
    it('should return 500 if API_KEY is not configured', async () => {
      delete process.env.API_KEY;

      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'some-key');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toBe('API key not configured');
    });

    it('should return 401 if Authorization header is missing', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toBe('Forbidden');
    });

    it('should return 401 if Authorization header does not start with Bearer', async () => {
      const headers = new Headers();
      headers.set('Authorization', 'Basic invalid-token');
      const request = new Request('http://localhost:3000/api/v1/get/our-products/all-data', {
        headers,
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toBe('Forbidden');
    });

    it('should return 401 if API key is invalid', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'wrong-api-key');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toBe('Invalid API key');
    });

    it('should pass authentication with valid API key', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Pagination Tests', () => {
    it('should use default pagination (page=1, limit=10)', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    it('should handle custom page and limit', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?page=2&limit=5',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should limit maximum items per page to 100', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?limit=500',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should handle invalid page numbers (default to 1)', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?page=-5',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        })
      );
    });

    it('should return correct pagination metadata', async () => {
      (db.products.count as jest.Mock).mockResolvedValue(25);
      
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?page=2&limit=10',
        'test-api-key-12345'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });
  });

  describe('Status Filter Tests', () => {
    it('should filter by status (case insensitive)', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?status=active',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should convert status to uppercase', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?status=InAcTiVe',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'INACTIVE',
          }),
        })
      );
    });
  });

  describe('Category Filter Tests', () => {
    it('should filter by category (exact match, case insensitive)', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?category=Internal Tools',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.categories.findMany).toHaveBeenCalled();
      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                id: { in: ['cat-1'] },
              },
            },
          }),
        })
      );
    });

    it('should filter by category (space insensitive)', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?category=internaltools',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                id: { in: ['cat-1'] },
              },
            },
          }),
        })
      );
    });

    it('should filter by multiple categories', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?category=Internal Tools,Public Platforms',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                id: { in: expect.arrayContaining(['cat-1', 'cat-2']) },
              },
            },
          }),
        })
      );
    });

    it('should handle categories with extra spaces', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?category=  Internal Tools  ,  Public Platforms  ',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                id: { in: expect.arrayContaining(['cat-1', 'cat-2']) },
              },
            },
          }),
        })
      );
    });

    it('should return empty results for non-existent category', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?category=NonExistentCategory',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { equals: -1 },
          }),
        })
      );
    });

    it('should ignore empty category strings', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?category=Internal Tools, , ,Public Platforms',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                id: { in: expect.arrayContaining(['cat-1', 'cat-2']) },
              },
            },
          }),
        })
      );
    });
  });

  describe('Combined Filters Tests', () => {
    it('should apply both status and category filters', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?status=active&category=Internal Tools',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            categories: {
              some: {
                id: { in: ['cat-1'] },
              },
            },
          }),
        })
      );
    });

    it('should apply status, category, and pagination together', async () => {
      const request = createRequest(
        'http://localhost:3000/api/v1/get/our-products/all-data?status=active&category=Internal Tools&page=2&limit=5',
        'test-api-key-12345'
      );
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            categories: {
              some: {
                id: { in: ['cat-1'] },
              },
            },
          }),
          skip: 5,
          take: 5,
        })
      );
    });
  });

  describe('Response Format Tests', () => {
    it('should return products with correct structure', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should include categories in product response', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            categories: true,
          },
        })
      );
    });

    it('should order by createdAt desc', async () => {
      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      await GET(request);

      expect(db.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        })
      );
    });
  });

  describe('Error Handling Tests', () => {
    it('should return 500 on database error', async () => {
      (db.products.count as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toBe('Internal Server Error');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      (db.products.count as jest.Mock).mockRejectedValue(error);

      const request = createRequest('http://localhost:3000/api/v1/get/our-products/all-data', 'test-api-key-12345');
      await GET(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[PRODUCTS_GET]', error);
      consoleErrorSpy.mockRestore();
    });
  });
});