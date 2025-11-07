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
      // schemas: {
      //   CreateUserDto: {
      //     type: 'object',
      //     required: ['name', 'email', 'password'],
      //     properties: {
      //       name: { type: 'string' },
      //       email: { type: 'string', format: 'email' },
      //       password: { type: 'string', minLength: 6 }
      //     }
      //   },
      //   UserResponseDto: {
      //     type: 'object',
      //     properties: {
      //       id: { type: 'string' },
      //       name: { type: 'string' },
      //       email: { type: 'string' },
      //       createdAt: { type: 'string', format: 'date-time' },
      //       updatedAt: { type: 'string', format: 'date-time' }
      //     }
      //   }
      // }
    }
  },
  apis: ['./src/routes/*.ts']
};

export default swaggerJSDoc(options);