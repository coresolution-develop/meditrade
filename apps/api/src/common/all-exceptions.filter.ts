import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { fail } from './api-response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '서버 오류가 발생했습니다.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse() as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (status === HttpStatus.BAD_REQUEST && resBody?.message) {
        code = 'VALIDATION_ERROR';
        message = Array.isArray(resBody.message)
          ? resBody.message.join(', ')
          : String(resBody.message);
      } else {
        // 도메인 코드(예: ILLEGAL_STATE)를 응답 본문에 명시적으로 담은 경우 우선 사용
        code = resBody?.code ?? this.mapStatusToCode(status);
        message = resBody?.message ?? exception.message;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `[${req.method}] ${req.url} - ${code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${req.method}] ${req.url} - ${code}: ${message}`);
    }

    res.status(status).json(fail(code, message));
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      default:
        return 'ERROR';
    }
  }
}
