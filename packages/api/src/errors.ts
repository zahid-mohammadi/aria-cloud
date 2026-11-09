/**
 * A typed error carrying an HTTP status and machine-readable code. Route files
 * map it to NextResponse.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

export function toHttpError(error: unknown): { status: number; error: string; message?: string } {
  if (error instanceof ApiError) {
    return { status: error.status, error: error.code, message: error.message };
  }
  const message = error instanceof Error ? error.message : undefined;
  return { status: 500, error: 'INTERNAL_ERROR', message };
}
