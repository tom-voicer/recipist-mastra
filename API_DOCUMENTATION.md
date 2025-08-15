# Recipe Extractor API Documentation

This API provides REST endpoints for extracting recipe data from URLs using the Mastra framework with a custom Hono server implementation.

## Quick Start

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The server will be available at `http://localhost:4111`

## API Endpoints

### Health Check

**GET** `/api/health`

Check if the API server is running.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Recipe Extractor

**POST** `/api/recipe-extractor`

Extract recipe data from a URL with optional language and unit preferences.

**Request Body:**

```json
{
  "url": "https://example.com/recipe", // Required: URL to extract recipe from
  "language": "Spanish", // Optional: Target language for translation
  "weightUnit": "grams", // Optional: Weight unit preference
  "lengthUnit": "cm", // Optional: Length unit preference
  "liquidUnit": "ml", // Optional: Liquid unit preference
  "temperatureUnit": "celsius" // Optional: Temperature unit preference
}
```

**Supported Units:**

- **Weight**: "grams", "g", "kilogram", "kg", "ounce", "oz", "pound", "pounds", "lb", "lbs"
- **Length**: "cm", "centimeter", "inch", "inches", "mm", "millimeter", "meter", "metres", "feet", "ft"
- **Liquid**: "ml", "milliliter", "liter", "litre", "cup", "cups", "tablespoon", "tbsp", "teaspoon", "tsp", "fluid ounce", "fl oz", "pint", "quart", "gallon"
- **Temperature**: "celsius", "c", "fahrenheit", "f", "kelvin", "k"

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "result": "Recipe extracted successfully",
    "recipeData": "# Extracted Recipe Content...",
    "imageUrl": "https://example.com/recipe-image.jpg",
    "isUrl": true,
    "isRecipe": true,
    "isSocial": false,
    "provider": null,
    "originalUrl": "https://example.com/recipe",
    "recipeName": "Delicious Recipe",
    "timeMinutes": 45,
    "servesPeople": 4,
    "makesItems": "N/A",
    "language": "Spanish",
    "languageCode": "es",
    "units": {
      "length": "cm",
      "liquid": "ml",
      "weight": "grams",
      "temperature": "celsius"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Missing required URL:

```json
{
  "error": "Missing required field: url"
}
```

**500 Internal Server Error** - Processing failed:

```json
{
  "error": "Failed to extract recipe",
  "message": "Detailed error message"
}
```

## Example Usage

### cURL

```bash
# Basic request
curl -X POST http://localhost:4111/api/recipe-extractor \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/"}'

# Request with all parameters
curl -X POST http://localhost:4111/api/recipe-extractor \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/",
    "language": "Spanish",
    "weightUnit": "grams",
    "lengthUnit": "cm",
    "liquidUnit": "ml",
    "temperatureUnit": "celsius"
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch("http://localhost:4111/api/recipe-extractor", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/",
    language: "Spanish",
    weightUnit: "grams",
    liquidUnit: "ml",
    temperatureUnit: "celsius",
  }),
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

response = requests.post('http://localhost:4111/api/recipe-extractor', json={
    'url': 'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/',
    'language': 'Spanish',
    'weightUnit': 'grams',
    'liquidUnit': 'ml',
    'temperatureUnit': 'celsius'
})

data = response.json()
print(data)
```

## Server Configuration

The server is configured with:

- **Port**: 4111 (configurable)
- **Timeout**: 30 seconds
- **CORS**: Enabled for all origins (development mode)
- **Request Logging**: All requests are logged with timing
- **Error Handling**: Comprehensive error handling and logging

## Testing

Run the test suite:

```bash
# Ensure server is running first
npm run dev

# In another terminal
node test-api.js
```

The test suite will check:

- Health endpoint functionality
- Recipe extraction with full parameters
- Recipe extraction with minimal parameters
- Invalid request handling

## Architecture

This implementation uses:

- **Mastra Framework**: For AI workflow orchestration
- **Hono**: As the underlying HTTP server framework
- **Custom Middleware**: For logging and error handling
- **Type Safety**: TypeScript interfaces for request validation

The workflow processes URLs through multiple steps:

1. Social provider detection
2. HTML content fetching
3. Content cleaning and conversion
4. Unit parsing and normalization
5. Image extraction
6. Recipe data extraction
7. Final formatting

## Error Handling

The API includes comprehensive error handling:

- Input validation for required fields
- Workflow execution error handling
- Network request timeouts
- Graceful degradation for optional features

All errors are logged server-side and return appropriate HTTP status codes with descriptive error messages.
