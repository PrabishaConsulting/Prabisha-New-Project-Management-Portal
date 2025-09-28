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
  'https://yourdomain.com/api/v1/get/our-products/all-data' \
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

url = "https://yourdomain.com/api/v1/get/our-products/all-data"
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