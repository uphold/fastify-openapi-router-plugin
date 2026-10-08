import { RouteOptions as FastifyRouteOptions, FastifyPluginCallback, FastifyRequest } from 'fastify'
import OpenAPI from 'openapi-types';
import { DECORATOR_NAME } from '../src/utils/constants'
import { errors } from '../src'

declare module 'fastify' {
  interface FastifyRequest {
    [DECORATOR_NAME]: {
      operation: OpenAPI.OpenAPIV3_1.OperationObject,
      security: SecurityData
      securityReport: SecurityReport
    }
  }

  interface FastifyInstance {
    [DECORATOR_NAME]: {
      errors: typeof errors
      route: (opts: RouteOptions) => FastifyInstance;
      installNotImplementedRoutes: () => void;
    }
  }
}

export interface SecurityData {
  [key:string]: any
}

export type SecurityReport = SecurityReportBlock[]

export interface SecurityReportBlock {
  ok: boolean
  schemes: {
    [key:string]: {
      ok: boolean,
      data?: any
      error?: any
    }
  }
}

export type SecurityHandler = (value: string, request: FastifyRequest) => SecurityHandlerReturn | undefined

export interface SecurityHandlerReturn { data?: any, scopes?: string[] }

export interface RouteOptions extends Omit<FastifyRouteOptions, "method" | "schema" | "url"> {
  operationId: string
}

export interface PluginOptions {
  spec?: string | OpenAPI.OpenAPIV3.Document | OpenAPI.OpenAPIV3_1.Document
  /**
   * Optional mapper invoked when every declared security scheme fails. Return an `Error` to
   * replace the generated unauthorized error, or `undefined` to keep it.
   */
  securityErrorMapper?: (error: errors.UnauthorizedError) => Error | undefined
  /**
   * Optional mapper invoked when a route declared by the spec has no handler registered.
   */
  notImplementedErrorMapper?: (error: errors.NotImplementedError) => Error | undefined
  securityHandlers?: {
    [key:string]: SecurityHandler
  }
}

export const openApiRouterPlugin: FastifyPluginCallback<PluginOptions>

export function verifyScopes(providedScopes: string[], requiredScopes: string[]): string[]

export function createSecurityHandlerError(error: Error, force?: boolean): typeof errors.SecurityHandlerError

export function createScopesMismatchError(providedScopes: string[], requiredScopes: string[], missingScopes: string[]): typeof errors.ScopesMismatchError

export function createUnauthorizedError(securityReport: SecurityReport): typeof errors.UnauthorizedError

export { errors }

export default openApiRouterPlugin
