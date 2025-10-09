# Products API Documentation

## Get All Products

Retrieves a list of all internal prabisha products with their current status and details.

### Endpoint
```
GET /api/v1/get/our-products/all-data
```

### Authentication
This endpoint requires an API key for authentication.

**Header:**
```
X-API-Key: {YOUR_API_KEY}
```

### Request
- **Method:** GET
- **Content-Type:** Not required
- **Parameters:** None

### Response

**Success Response (200 OK):**
```json
[
  {
    "id": "cmfxjjyis0001ju04sct4a0d3",
    "title": "HR Portal",
    "status": "ACTIVE",
    "url": "https://hr.prabisha.com/",
    "createdAt": "2025-09-24T05:26:12.761Z",
    "updatedAt": "2025-09-24T05:26:12.761Z"
  },
  {
    "id": "cmfxjjyis0001ju04sct4a0d4",
    "title": "CRM System",
    "status": "ACTIVE",
    "url": "https://crm.prabisha.com/",
    "createdAt": "2025-09-22T10:15:30.125Z",
    "updatedAt": "2025-09-23T14:20:45.890Z"
  }
]
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the product |
| `title` | string | Display name of the product |
| `status` | string | Current status (`ACTIVE`, `INACTIVE`, `MAINTENANCE`) |
| `url` | string | Product URL/endpoint |
| `createdAt` | string | ISO 8601 timestamp of creation |
| `updatedAt` | string | ISO 8601 timestamp of last update |

### Status Codes

| Code | Description |
|------|-------------|
| `200` | Success - Products retrieved |
| `401` | Unauthorized - Invalid or missing API key |
| `500` | Internal Server Error |

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Unable to fetch products data"
}
```

### Example Usage

**cURL:**
```bash
curl -X GET \
  'https://projects.prabisha.com/api/v1/get/our-products/all-data' \
  -H 'X-API-Key: your_api_key_here'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('/api/v1/get/our-products/all-data', {
  method: 'GET',
  headers: {
    'X-API-Key': 'your_api_key_here'
  }
});

const products = await response.json();
console.log(products);
```

**Python (Requests):**
```python
import requests

url = "https://projects.prabisha.com/api/v1/get/our-products/all-data"
headers = {
    "X-API-Key": "your_api_key_here"
}

response = requests.get(url, headers=headers)
products = response.json()
print(products)
```

### Implementation Notes

- API key is validated against environment variable `API_KEY`
- Returns all products regardless of status
- Data is returned in JSON format
- Timestamps are in UTC ISO 8601 format
- No pagination currently implemented

### Rate Limiting
- No rate limiting currently implemented
- Consider implementing if public usage increases

### Security Considerations
- API key should be kept secure and not exposed in client-side code
- Consider implementing IP whitelisting for additional security
- Regular API key rotation recommended

---

**Last Updated:** September 2025  
**Version:** v1.0







# Project API Documentation

# Get All Projects


Retrieves a paginated list of projects with filtering, sorting, and optional related data.

### Endpoint
```
GET /api/v1/get/project/all-data
```

### Authentication
This endpoint requires API key authentication.

**Header:**
```
Authorization: {YOUR_API_KEY}
```

### Query Parameters

#### Pagination Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (minimum: 1) |
| `limit` | integer | 10 | Items per page (maximum: 100) |
| `offset` | integer | - | Skip specific number of records (overrides page calculation) |

#### Sorting Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sortBy` | string | "createdAt" | Field to sort by (`id`, `name`, `createdAt`, `updatedAt`, `status`) |
| `sortDirection` | string | "desc" | Sort direction (`asc` or `desc`) |

#### Filter Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by project status |
| `userId` | string | Filter by user ID |
| `categoryId` | string | Filter by category ID |
| `isActive` | boolean | Filter by active status (`true` or `false`) |
| `search` | string | Search across project name and description |
| `createdAfter` | string | Filter projects created after this date (ISO format) |
| `createdBefore` | string | Filter projects created before this date (ISO format) |

#### Additional Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeRelations` | boolean | false | Include related data (members, tasks) |

### Request Examples

#### Basic Request
```bash
curl -X GET \
  'https://projects.prabisha.com/api/v1/get/project/all-data' \
  -H 'Authorization: your_api_key_here'
```

#### With Pagination
```bash
curl -X GET \
  'https://projects.prabisha.com/api/v1/get/project/all-data?page=2&limit=20' \
  -H 'Authorization: your_api_key_here'
```

#### With Filters and Sorting
```bash
curl -X GET \
  'https://projects.prabisha.com/api/v1/get/project/all-data?status=ACTIVE&sortBy=name&sortDirection=asc&includeRelations=true' \
  -H 'Authorization: your_api_key_here'
```

#### With Search and Date Range
```bash
curl -X GET \
  'https://projects.prabisha.com/api/v1/get/project/all-data?search=website&createdAfter=2024-01-01&createdBefore=2024-12-31' \
  -H 'Authorization: your_api_key_here'
```

### Response Format

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "cmfxjjyis0001ju04sct4a0d3",
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "status": "ACTIVE",
      "userId": "user123",
      "categoryId": "cat456",
      "isActive": true,
      "createdAt": "2024-09-24T05:26:12.761Z",
      "updatedAt": "2024-09-24T05:26:12.761Z",
      "members": [
        {
          "user": {
            "name": "John Doe",
            "email": "john@example.com",
            "avatar": "https://example.com/avatar.jpg"
          }
        }
      ],
      "tasks": [
        {
          "id": "task123",
          "title": "Create Homepage",
          "status": "IN_PROGRESS"
        }
      ]
    }
  ],
  "message": "10 projects retrieved successfully",
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 15,
    "totalItems": 150,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Response Schema

**Main Response Object:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data` | array | Array of project objects |
| `message` | string | Success message |
| `meta` | object | Pagination metadata |
| `pagination` | object | Extended pagination information |

**Project Object:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique project identifier |
| `name` | string | Project name |
| `description` | string | Project description |
| `status` | string | Project status |
| `userId` | string | Project owner ID |
| `categoryId` | string | Project category ID |
| `isActive` | boolean | Active status |
| `createdAt` | string | Creation timestamp (ISO 8601) |
| `updatedAt` | string | Last update timestamp (ISO 8601) |
| `members` | array | Project members (if `includeRelations=true`) |
| `tasks` | array | Project tasks (if `includeRelations=true`) |

**Meta Object:**
| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of projects |
| `page` | number | Current page number |
| `limit` | number | Items per page |
| `totalPages` | number | Total number of pages |

**Pagination Object:**
| Field | Type | Description |
|-------|------|-------------|
| `currentPage` | number | Current page number |
| `totalPages` | number | Total number of pages |
| `totalItems` | number | Total number of items |
| `itemsPerPage` | number | Items per page |
| `hasNextPage` | boolean | Whether next page exists |
| `hasPrevPage` | boolean | Whether previous page exists |

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

#### 400 Bad Request (Invalid Parameters)
```json
{
  "success": false,
  "error": "Invalid pagination parameters",
  "message": "Page and limit must be positive numbers"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Internal server error"
}
```

### Status Codes

| Code | Description |
|------|-------------|
| `200` | Success - Projects retrieved |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Invalid or missing API key |
| `500` | Internal Server Error - Server error |

### Usage Examples

#### JavaScript (Fetch)
```javascript
const response = await fetch('/api/v1/get/project/all-data?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'your_api_key_here'
  }
});

const result = await response.json();

if (result.success) {
  console.log('Projects:', result.data);
  console.log('Total:', result.meta.total);
} else {
  console.error('Error:', result.message);
}
```

#### Python (Requests)
```python
import requests

url = "https://projects.prabisha.com/api/v1/get/project/all-data"
headers = {
    "Authorization": "your_api_key_here"
}
params = {
    "page": 1,
    "limit": 20,
    "status": "ACTIVE",
    "includeRelations": "true"
}

response = requests.get(url, headers=headers, params=params)
data = response.json()

if data["success"]:
    print(f"Found {len(data['data'])} projects")
    for project in data["data"]:
        print(f"- {project['name']}: {project['status']}")
else:
    print(f"Error: {data['message']}")
```

#### Node.js (Axios)
```javascript
const axios = require('axios');

const config = {
  method: 'get',
  url: 'https://projects.prabisha.com/api/v1/get/project/all-data',
  headers: {
    'Authorization': 'your_api_key_here'
  },
  params: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortDirection: 'desc'
  }
};

try {
  const response = await axios(config);
  console.log('Projects retrieved:', response.data.data.length);
  console.log('Pagination:', response.data.pagination);
} catch (error) {
  console.error('API Error:', error.response.data);
}
```

### Query Parameter Combinations

#### Get Active Projects with Members
```
?status=ACTIVE&includeRelations=true
```

#### Search with Pagination
```
?search=website&page=2&limit=15
```

#### Date Range with Sorting
```
?createdAfter=2024-01-01&sortBy=name&sortDirection=asc
```

#### User's Projects
```
?userId=user123&isActive=true&sortBy=updatedAt&sortDirection=desc
```

### Performance Notes

- Maximum 100 records per request
- Use `offset` parameter for large datasets
- `includeRelations=true` increases response size and processing time
- Consider caching for frequently accessed data
- Use date range filters to limit result sets

### Rate Limiting

- No rate limiting currently implemented
- Consider implementing rate limiting for production use

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2024-09-28 | Initial API release |

---

**Base URL:** `https://projects.prabisha.com`  
**API Version:** v1  
**Last Updated:** September 2024






# Client API Docs

The Client API provides access to client data stored in our system. This API follows RESTful principles and returns data in JSON format. All requests require authentication using an API key.

## Base URL
```
http://projects.prabisha.com/api/v1/get/our-client
```

## Authentication
All requests to the Client API must include an API key in the request headers:
```
x-api-key: YOUR_API_KEY
```



### Get Client Data
Retrieve client data with optional filtering and pagination.

**Endpoint:** `GET /api/v1/get/our-client`

**Query Parameters:**
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `type` | string | Yes | Must be "user" to retrieve user data | - |
| `userType` | string | No | Filter users by type (only "CLIENT" is supported) | - |
| `page` | number | No | Page number for pagination | 1 |
| `limit` | number | No | Number of items per page (max 100) | 10 |

**Example Request:**
```bash
curl -X GET "http://projects.prabisha.com/api/v1/get/our-client?type=user&userType=CLIENT&page=1&limit=10" \
-H "x-api-key: YOUR_API_KEY"
```

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "clx1a2b3c4d5e6",
      "userCode": "CLI-001",
      "email": "client@example.com",
      "name": "John Doe",
      "userType": "CLIENT",
      "industry": "Technology",
      "location": "New York",
      "createdAt": "2023-05-15T14:30:00.000Z",
      "updatedAt": "2023-06-20T09:15:00.000Z"
    },
    {
      "id": "clx7f8g9h0i1j2",
      "userCode": "CLI-002",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "userType": "CLIENT",
      "industry": "Finance",
      "location": "London",
      "createdAt": "2023-06-10T11:20:00.000Z",
      "updatedAt": "2023-06-22T16:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 25,
    "totalPages": 3
  }
}
```

**Error Responses:**

- **401 Unauthorized**
  ```json
  {
    "error": "Unauthorized: Invalid API key"
  }
  ```

- **400 Bad Request**
  ```json
  {
    "error": "Invalid pagination parameters"
  }
  ```
  or
  ```json
  {
    "error": "Invalid userType parameter"
  }
  ```
  or
  ```json
  {
    "error": "Invalid type parameter. Use \"user\" or \"product\""
  }
  ```

- **500 Internal Server Error**
  ```json
  {
    "error": "Internal server error"
  }
  ```

## Data Model

### User Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the user |
| `userCode` | string | Optional unique user code |
| `email` | string | User's email address (unique) |
| `name` | string | User's full name |
| `userType` | string | Type of user (e.g., "CLIENT") |
| `industry` | string | Industry associated with the user |
| `location` | string | User's location |
| `createdAt` | string | ISO 8601 timestamp when the user was created |
| `updatedAt` | string | ISO 8601 timestamp when the user was last updated |

### Pagination Object
| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page number |
| `limit` | number | Number of items per page |
| `totalCount` | number | Total number of items available |
| `totalPages` | number | Total number of pages available |

## Implementation Notes

1. **Security**:
   - The API implements a zero-trust security model requiring API key authentication
   - The API key should be stored securely in environment variables
   - Only "CLIENT" user type is supported in this implementation

2. **Pagination**:
   - Results are paginated with configurable page size (max 100 items per page)
   - Pagination metadata includes current page, items per page, total count, and total pages

3. **Data Filtering**:
   - Results can be filtered by userType (only "CLIENT" is supported)
   - Results are sorted by creation date in descending order (newest first)

4. **Rate Limiting**:
   - Consider implementing rate limiting in production to prevent abuse

5. **Caching**:
   - Consider implementing caching for frequently accessed data to improve performance

## Testing the API

To test this API endpoint:

1. Obtain a valid API key
2. Use a tool like Postman, Insomnia, or curl to make requests
3. Include the API key in the `x-api-key` header
4. Specify the required `type=user` parameter
5. Optionally include pagination parameters (`page`, `limit`) and filtering (`userType=CLIENT`)

Example using curl:
```bash
curl -X GET "http://projects.prabisha.com/api/v1/get/our-client?type=user&userType=CLIENT" \
-H "x-api-key: YOUR_API_KEY" | jq
```
