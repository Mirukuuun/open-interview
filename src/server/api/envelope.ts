export function apiOk<T>(data: T) {
  return {
    ok: true as const,
    data,
  };
}

export function apiError(code: string, message: string, details?: unknown) {
  return {
    ok: false as const,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}
