declare module "better-sqlite3" {
  export interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
    nativeBinding?: string;
  }

  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement<
    BindParameters extends unknown[] = unknown[],
    Result = unknown,
  > {
    run(...params: BindParameters): RunResult;
    get(...params: BindParameters): Result | undefined;
    all(...params: BindParameters): Result[];
    raw(toggle?: boolean): this;
  }

  type TransactionFunction<T extends (...args: unknown[]) => unknown> = {
    (...args: Parameters<T>): ReturnType<T>;
    deferred(...args: Parameters<T>): ReturnType<T>;
    immediate(...args: Parameters<T>): ReturnType<T>;
    exclusive(...args: Parameters<T>): ReturnType<T>;
  };

  class BetterSqlite3Database {
    constructor(filename?: string | Buffer, options?: Options);

    pragma(source: string, options?: { simple?: boolean }): unknown;
    prepare<BindParameters extends unknown[] = unknown[], Result = unknown>(
      source: string,
    ): Statement<BindParameters, Result>;
    transaction<T extends (...args: unknown[]) => unknown>(
      fn: T,
    ): TransactionFunction<T>;
    exec(source: string): this;
    close(): this;
  }

  export type Database = BetterSqlite3Database;
  export default BetterSqlite3Database;
}
