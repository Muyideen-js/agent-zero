/** Input guards for API routes. */
export const isCompanyId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9_-]{1,64}$/i.test(v);
export const isTaskId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(v);
export const isAccountId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9._-]{2,64}$/.test(v);
