declare module 'oracledb' {
  export const OUT_FORMAT_OBJECT: number;
  export const OUT_FORMAT_ARRAY: number;
  export const BIND_IN: number;
  export const BIND_OUT: number;
  export const BIND_INOUT: number;

  export const NUMBER: number;
  export const STRING: number;
  export const DATE: number;
  export const CURSOR: number;
  export const BUFFER: number;
  export const CLOB: number;
  export const BLOB: number;

  export let outFormat: number;
  export let autoCommit: boolean;

  export type BindParameters = Record<string, unknown> | unknown[];

  export interface ExecuteOptions {
    autoCommit?: boolean;
    outFormat?: number;
    maxRows?: number;
    bindDefs?: Record<string, { type: number; maxSize?: number }>;
    [key: string]: unknown;
  }

  export interface Result<T = unknown, TOut = any> {
    rows?: T[];
    rowsAffected?: number;
    outBinds?: TOut;
    metaData?: { name: string }[];
  }

  export interface Connection {
    execute<T = unknown, TOut = any>(
      sql: string,
      binds?: BindParameters,
      options?: ExecuteOptions
    ): Promise<Result<T, TOut>>;
    executeMany<T = unknown, TOut = any>(
      sql: string,
      binds: BindParameters[],
      options?: ExecuteOptions
    ): Promise<Result<T, TOut>>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    close(): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  export interface PoolAttributes {
    user?: string;
    password?: string;
    connectString?: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
    poolTimeout?: number;
  }

  export function createPool(attrs: PoolAttributes): Promise<Pool>;
  export function getConnection(attrs?: PoolAttributes): Promise<Connection>;

  const oracledb: {
    OUT_FORMAT_OBJECT: number;
    OUT_FORMAT_ARRAY: number;
    BIND_IN: number;
    BIND_OUT: number;
    BIND_INOUT: number;
    NUMBER: number;
    STRING: number;
    DATE: number;
    CURSOR: number;
    BUFFER: number;
    CLOB: number;
    BLOB: number;
    outFormat: number;
    autoCommit: boolean;
    createPool(attrs: PoolAttributes): Promise<Pool>;
    getConnection(attrs?: PoolAttributes): Promise<Connection>;
  };

  export default oracledb;
}
