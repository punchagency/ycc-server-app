import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'YCC Server API',
      version: '1.0.0',
      description: 'API documentation for YCC Server'
    },
    servers: [
      {
        url: 'http://localhost:7000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and profile management endpoints'
      },
      {
        name: 'Category',
        description: 'Category management endpoints'
      },
      {
        name: 'Service',
        description: 'Service management endpoints'
      },
      {
        name: 'Product',
        description: 'Product catalog and inventory management endpoints'
      },
      {
        name: 'Cart',
        description: 'Shopping cart management endpoints'
      },
      {
        name: 'Order',
        description: 'Order processing and management endpoints'
      },
      {
        name: 'Booking',
        description: 'Service booking management endpoints'
      },
      {
        name: 'Quote',
        description: 'Quote approval and management endpoints'
      },
      {
        name: 'Events',
        description: 'Event management and guest invitation endpoints'
      },
      {
        name: 'Documents',
        description: 'Document management endpoints'
      },
      {
        name: 'Admin Analytics',
        description: 'Admin analytics and reporting endpoints'
      },
      {
        name: 'Distributor Analytics',
        description: 'Distributor analytics and business metrics endpoints'
      },
      {
        name: 'Search',
        description: 'Global search across multiple entities'
      }
    ]
  },
  apis: ['./src/docs/*.ts']
};

export default swaggerJSDoc(options);