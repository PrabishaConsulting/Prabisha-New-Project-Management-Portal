// __tests__/api/client-endpoint.test.ts
import { GET } from '@/app/api/v1/get/our-client/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// Mock the database module
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    internalProduct: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock environment variables
beforeAll(() => {
  process.env.API_KEY = process.env.API_KEY;
});

describe('Client API Endpoint', () => {
  // Helper function to create mock request
  const createMockRequest = (url: string, apiKey: string = process.env.API_KEY as string) => {
    const headers = new Headers();
    headers.set('x-api-key', apiKey);
    return new NextRequest(new URL(url, 'http://localhost:3000'), { headers });
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Unit Tests', () => {
    it('should return 401 if API key is missing', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=user', '');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized: Invalid API key' });
    });

    it('should return 401 if API key is invalid', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=user', 'invalid-key');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized: Invalid API key' });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=user&page=-1');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid pagination parameters' });
    });

    it('should return 400 for invalid type parameter', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=invalid');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid type parameter. Use "user" or "product"' });
    });

    it('should return 400 for invalid userType parameter', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=user&userType=INVALID');
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid userType parameter' });
    });

    it('should call user.findMany with correct parameters for user type', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=user&userType=CLIENT');
      const mockUsers = [
        { id: '1', name: 'Test User', email: 'test@example.com' },
      ];
      (db.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (db.user.count as jest.Mock).mockResolvedValue(1);
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { userType: 'CLIENT' },
        skip: 0,
        take: 10,
        select: {
          id: true,
          userCode: true,
          email: true,
          name: true,
          userType: true,
          industry: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 1,
          totalPages: 1
        }
      });
    });

    it('should call internalProduct.findMany for product type', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=internalproduct');
      const mockProducts = [
        { id: '1', name: 'Test Product' },
      ];
      (db.internalProduct.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (db.internalProduct.count as jest.Mock).mockResolvedValue(1);
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(db.internalProduct.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: mockProducts,
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 1,
          totalPages: 1
        }
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const request = createMockRequest('/api/v1/get/our-client?type=user&userType=CLIENT');
      (db.user.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Act
      const response = await GET(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });
  });

  describe('Integration Tests', () => {
    // These tests would require a test database and actual HTTP requests
    // They would be slower and more complex to set up
    
    it('should return actual user data from test database', async () => {
      // This test would require:
      // 1. Setting up a test database
      // 2. Seeding the database with test data
      // 3. Making an actual HTTP request to the endpoint
      // 4. Verifying the response matches the database data
      
      // Example pseudo-code:
      // await setupTestDatabase();
      // await seedTestData();
      // const response = await fetch('http://localhost:3000/api/v1/get/our-client?type=user&userType=CLIENT', {
      //   headers: { 'x-api-key': 'test-api-key' }
      // });
      // const data = await response.json();
      // expect(data.data).toEqual(expectedUsersFromDatabase);
    });
  });
});