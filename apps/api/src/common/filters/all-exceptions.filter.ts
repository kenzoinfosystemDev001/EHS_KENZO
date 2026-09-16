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
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${requestId}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
    }

    const errorDetails = Array.isArray(message)
      ? message
      : typeof message === "object" && message !== null
        ? message
        : [];
    const errorMessage =
      typeof message === "string"
        ? message
        : "An error occurred during request processing";

    response.status(status).json({
      success: false,
      statusCode: status,
      message: errorMessage,
      error: {
        code: errorType,
        message: errorMessage,
        details: errorDetails,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
