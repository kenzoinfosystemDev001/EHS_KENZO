import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ResponseMeta {
  requestId: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta: ResponseMeta;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseEnvelope<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    return next.handle().pipe(
      map((data) => {
        // If data contains pagination/meta wrapper from services
        if (data && typeof data === 'object' && 'items' in data && 'total' in data) {
          const page = Number(req.query.page) || 1;
          const pageSize = Number(req.query.limit) || 20;
          const total = Number(data.total) || 0;
          const totalPages = Math.ceil(total / pageSize);

          return {
            success: true,
            data: data.items,
            meta: {
              page,
              pageSize,
              total,
              totalPages,
              requestId,
            },
          };
        }

        return {
          success: true,
          data: data !== undefined ? data : null,
          meta: {
            requestId,
          },
        };
      }),
    );
  }
}
