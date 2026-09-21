import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers["x-request-id"] as string) || "unknown";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "Internal server error occurred";
    let errorType = "InternalServerError";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        message = (res as Record<string, unknown>).message || res;
        errorType =
          ((res as Record<string, unknown>).error as string) || exception.name;
      }
    } else if (
      exception &&
      typeof exception === "object" &&
      ("status" in exception || "statusCode" in exception || "type" in exception)
    ) {
      const exObj = exception as any;
      status = exObj.status || exObj.statusCode || HttpStatus.BAD_REQUEST;
      message = exObj.message || "Request validation failed";
      errorType = exObj.type || exObj.name || "RequestError";
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || "Internal server error occurred";
      errorType = exception.name || "InternalServerError";
    }

    const isProduction = process.env.NODE_ENV === "production";

    // In production, never expose internal database/system errors or stack details to client
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId}] 5xx Error at ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.message : JSON.stringify(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );

      if (isProduction) {
        message = "An internal server error occurred. Please reference the requestId when contacting support.";
        errorType = "INTERNAL_SERVER_ERROR";
      }
    }

    const errorDetails = Array.isArray(message)
      ? message
      : typeof message === "object" && message !== null
        ? message
        : undefined;

    const errorMessage =
      typeof message === "string"
        ? message
        : Array.isArray(message)
          ? (message[0] as string) || "Validation failed"
          : "An error occurred during request processing";

    response.status(status).json({
      success: false,
      statusCode: status,
      message: errorMessage,
      error: {
        code: errorType,
        message: errorMessage,
        requestId,
        ...(errorDetails ? { details: errorDetails } : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
