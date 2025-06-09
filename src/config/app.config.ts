import { registerAs } from "@nestjs/config";

export default registerAs("express", () => ({
  env: process.env.APP_ENV,
  version: process.env.APP_VERSION,
  name: process.env.APP_NAME,
  description: `Please follow the below instructions.
  
  1). **Unique and Meaningful Endpoints**: Each API endpoint should be unique and meaningful.
  
  2). **Proper Tag Naming**: Use appropriate and meaningful tag names. Each module should have a separate tag.

    Example: For user management module APIs in the admin panel, the tag name should be User Management.

  3). **API Tagging**: Each module should have a distinct tag.

  4). **Summaries for APIs**: Include a proper summary for each API.
  
  5). **Request and Response Parameters**: Ensure proper request and response parameters are provided.

  6). **Uniform Response Format**: The API response format should be consistent across the application. The **data** key should always be an object.
  
    {

      statusCode: 200,
      
      message: "Success/Failure",
      
      data: {}
      
    }

  7). **Disable Swagger in Staging/Production**: Swagger should be disabled when deploying the application to staging or production environments.

  8). **CamelCase for Database Keys**: Use camelCase for key names in the database.

    Example: firstName

  9). **HTTP Status Codes**: Strictly follow the standard HTTP status codes. A reference link is provided: https://restfulapi.net/http-status-codes/ 
  
  `,
  url: process.env.APP_URL,
  port: process.env.APP_PORT || 3000,
  environment: process.env.APP_ENV || "development",
  enableCors: process.env.APP_ENABLE_CORS ? process.env.APP_ENABLE_CORS : false,
  throttler: {
    ttlTime: process.env.APP_THROTTLER_TTL_TIME
      ? process.env.APP_THROTTLER_TTL_TIME
      : 60,
    requestCount: process.env.APP_THROTTLER_REQUEST_COUNT
      ? process.env.APP_THROTTLER_REQUEST_COUNT
      : 10,
  },
  cryptoSecretKey: process.env.CRYPTO_SECRET_KEY,
}));
