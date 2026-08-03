export interface HttpCallResult<TData = unknown> {
  status: number;
  headers: Record<string, unknown>;
  data: TData;
}