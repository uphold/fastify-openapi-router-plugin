import { RouteOptions as FastifyRouteOptions, FastifyPluginCallback, FastifyRequest } from 'fastify'
import OpenAPI from 'openapi-types';
import { DECORATOR_NAME } from '../src/utils/constants'
import { errors } from '../src/errors'

declare module 'fastify' {
  interface FastifyRequest {
    [DECORATOR_NAME]: {
      operation: OpenAPI.OpenAPIV3_1.OperationObject,
      security: RequestSecurity
      securityReport: RequestSecurityReportEntry[]
    }
  }

  interface FastifyInstance {
    [DECORATOR_NAME]: {
      errors: typeof errors
      route: (opts: RouteOptions) => FastifyInstance;
    }
  }
}

export interface RequestSecurity {
  [key:string]: any
}

export interface RequestSecurityReportEntry {
  ok: boolean
  schemes: {
    [key:string]: {
      ok: boolean,
      data?: any
      error?: any
    }
  }
}

export interface RequestSecurityReportResult {
  ok: boolean
  schemes: {
    [key:string]: RequestSecurityReportResult
  }
}

export type SecurityHandler = (value: string, request: FastifyRequest) => SecurityHandlerReturn | undefined

export interface SecurityHandlerReturn { data?: any, scopes?: string[] }

export interface RouteOptions extends Omit<FastifyRouteOptions, "method" | "schema" | "url"> {
  operationId: string
}

export interface PluginOptions {
  spec?: string | OpenAPI.OpenAPIV3.Document | OpenAPI.OpenAPIV3_1.Document
  securityHandlers?: {
    [key:string]: SecurityHandler
  }
}

export const openApiRouterPlugin: FastifyPluginCallback<PluginOptions>

export default openApiRouterPlugin
