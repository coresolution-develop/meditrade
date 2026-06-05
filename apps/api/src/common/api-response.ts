export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
}

export function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return { success: true, code: 'OK', message, data };
}

export function fail(code: string, message: string): ApiResponse<null> {
  return { success: false, code, message, data: null };
}
