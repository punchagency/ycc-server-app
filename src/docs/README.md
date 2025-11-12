# API Documentation

This folder contains Swagger/OpenAPI documentation for all API endpoints in the YCC Server.

## Documentation Files

### Authentication (`auth.docs.ts`)
- POST /auth/register - Register new user
- POST /auth/login - User login
- POST /auth/refresh-token - Refresh access token
- POST /auth/logout - User logout (protected)
- POST /auth/change-password - Change password (protected)
- GET /auth/profile - Get user profile (protected)
- PUT /auth/profile - Update user profile (protected)

### Category (`category.docs.ts`)
- POST /category - Create category (protected, file upload)
- GET /category - Get all categories
- GET /category/:id - Get category by ID
- PUT /category/:id - Update category (protected, file upload)
- DELETE /category/:id - Delete category (protected)

### Service (`service.docs.ts`)
- POST /service - Create service (protected, file upload)
- GET /service/business - Get business services (protected)
- GET /service/:id - Get service by ID (protected)
- PUT /service/:id - Update service (protected, file upload)
- DELETE /service/:id - Delete service (protected)

### Product (`product.docs.ts`)
- POST /product - Create product (protected, file upload)
- GET /product/search - Search products
- GET /product/business - Get business products (protected)
- GET /product/low-stock - Get low stock products (protected)
- GET /product/:id - Get product by ID
- PUT /product/:id - Update product (protected, file upload)
- DELETE /product/:id - Delete product (protected)
- PATCH /product/:id/stock - Update product stock (protected)

### Cart (`cart.docs.ts`)
- GET /cart - Get user's cart (protected)
- POST /cart/add - Add item to cart (protected)
- PUT /cart/update - Update cart item (protected)
- DELETE /cart/remove/:productId - Remove item from cart (protected)
- DELETE /cart/clear - Clear cart (protected)

### Order (`order.docs.ts`)
- POST /orders - Create order (protected)
- GET /crew-orders/confirm/:token - Confirm order with token
- POST /crew-orders/decline/:token - Decline order with token
- PATCH /orders/status - Update order status (protected)

### Booking (`booking.docs.ts`)
- POST /booking - Create booking (protected, file upload)
- GET /booking - Get all bookings (protected)
- GET /booking/:id - Get booking by ID (protected)
- PATCH /booking/:id/confirm - Confirm booking (protected)
- PATCH /booking/:id/status - Update booking status (protected)

### Quote (`quote.docs.ts`)
- POST /quote/:id/approve - Approve quote and pay (protected)
- POST /quote/:id/decline - Decline quote (protected)

## Usage

All documentation is automatically loaded by Swagger via the configuration in `src/config/swagger.ts`.

Access the interactive API documentation at: `http://localhost:7000/api-docs`

## Authentication

Protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## File Uploads

Endpoints with file upload support use `multipart/form-data` content type.
