/**
 * @swagger
 * /api/v2/product/bulk:
 *   post:
 *     tags: [Product]
 *     summary: Create multiple products in bulk with category names
 *     description: Upload multiple products at once. Categories will be created automatically if they don't exist. No authentication required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, products]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (valid MongoDB ObjectId)
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, price, categoryName, quantity, minRestockLevel, hsCode, weight, length, width, height, wareHouseAddress]
 *                   properties:
 *                     name:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 200
 *                       description: Product name
 *                     price:
 *                       type: number
 *                       minimum: 0.01
 *                       description: Product price
 *                     categoryName:
 *                       type: string
 *                       description: Category name (will be created if doesn't exist)
 *                     sku:
 *                       type: string
 *                       description: Stock Keeping Unit (optional)
 *                     quantity:
 *                       type: number
 *                       minimum: 0
 *                       description: Initial stock quantity
 *                     minRestockLevel:
 *                       type: number
 *                       minimum: 0
 *                       description: Minimum stock level
 *                     description:
 *                       type: string
 *                       description: Product description (optional)
 *                     hsCode:
 *                       type: string
 *                       description: Harmonized System code
 *                     weight:
 *                       type: number
 *                       description: Product weight
 *                     length:
 *                       type: number
 *                       description: Product length
 *                     width:
 *                       type: number
 *                       description: Product width
 *                     height:
 *                       type: number
 *                       description: Product height
 *                     wareHouseAddress:
 *                       type: object
 *                       required: [state, country]
 *                       properties:
 *                         street:
 *                           type: string
 *                         zipcode:
 *                           type: string
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         country:
 *                           type: string
 *     responses:
 *       201:
 *         description: Products created successfully with summary including new categories
 *       400:
 *         description: Validation error or User ID/Business not found
 *       500:
 *         description: Failed to create products
 */

/**
 * @swagger
 * /api/v2/product:
 *   post:
 *     tags: [Product]
 *     summary: Create a new product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, category, quantity, minRestockLevel, hsCode, weight, length, width, height, wareHouseAddress]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 200
 *                 description: Product name (2-200 characters)
 *               price:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Product price (must be greater than 0)
 *               category:
 *                 type: string
 *                 description: Category ID (valid MongoDB ObjectId)
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit (optional)
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 description: Initial stock quantity
 *               minRestockLevel:
 *                 type: number
 *                 minimum: 0
 *                 description: Minimum stock level before restock alert
 *               description:
 *                 type: string
 *                 description: Product description (optional)
 *               hsCode:
 *                 type: string
 *                 description: Harmonized System code for customs
 *               weight:
 *                 type: number
 *                 description: Product weight
 *               length:
 *                 type: number
 *                 description: Product length
 *               width:
 *                 type: number
 *                 description: Product width
 *               height:
 *                 type: number
 *                 description: Product height
 *               wareHouseAddress:
 *                 type: object
 *                 required: [state, country]
 *                 properties:
 *                   street:
 *                     type: string
 *                   zipcode:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *               productImage:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (optional)
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error or Business ID required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create product
 */

/**
 * @swagger
 * /api/v2/product/search:
 *   get:
 *     tags: [Product]
 *     summary: Search products with filters
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by product name (case-insensitive)
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter by business ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/v2/product/business:
 *   get:
 *     tags: [Product]
 *     summary: Get products for authenticated user's business
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: stockLevel
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by stock level (low = quantity <= minRestockLevel, medium = quantity <= minRestockLevel * 2, high = quantity > minRestockLevel * 2)
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/v2/product/low-stock:
 *   get:
 *     tags: [Product]
 *     summary: Get low stock products for authenticated user's business
 *     description: Returns products where quantity is less than or equal to minRestockLevel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 *       400:
 *         description: Business ID is required
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v2/product/{id}:
 *   get:
 *     tags: [Product]
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/v2/product/{id}:
 *   put:
 *     tags: [Product]
 *     summary: Update product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               sku:
 *                 type: string
 *               quantity:
 *                 type: number
 *               minRestockLevel:
 *                 type: number
 *               description:
 *                 type: string
 *               hsCode:
 *                 type: string
 *               weight:
 *                 type: number
 *               length:
 *                 type: number
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *               wareHouseAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   zipcode:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *               productImage:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - product belongs to different business
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to update product
 */

/**
 * @swagger
 * /api/v2/product/{id}:
 *   delete:
 *     tags: [Product]
 *     summary: Delete product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - product belongs to different business
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to delete product
 */

/**
 * @swagger
 * /api/v2/product/{id}/stock:
 *   patch:
 *     tags: [Product]
 *     summary: Update product stock quantity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 description: New stock quantity (must be non-negative)
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Invalid product ID or quantity
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - product belongs to different business
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to update stock
 */
