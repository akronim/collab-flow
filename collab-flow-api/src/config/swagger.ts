import swaggerJSDoc from 'swagger-jsdoc'
import config from './index'

const swaggerOptions: swaggerJSDoc.Options = {
  swaggerDefinition: {
    openapi: `3.0.0`,
    info: {
      title: `Collab Flow API`,
      version: `1.0.0`,
      description: `API documentation for the Collab Flow application`
    },
    servers: [
      {
        url: `http://localhost:${config.port}`
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: `http`,
          scheme: `bearer`,
          bearerFormat: `JWT`
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [`./src/routes/*.ts`, `./src/models/*.ts`]
}

export const swaggerSpec = swaggerJSDoc(swaggerOptions)
