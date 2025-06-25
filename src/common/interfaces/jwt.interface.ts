export interface JwtPayload {
  _id: string;
  email?: string;
  role: string;
  permissions: Record<
    string,
    { view?: boolean; add?: boolean; edit?: boolean; toggleStatus?: boolean }
  >;
}
