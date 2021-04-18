export interface GraphqlQLResponseType {
  result: boolean;
  message: string;
}

export interface ServiceResponseType<T> {
  code: number;
  message: string;
  value?: T;
}
