import { api, setToken, clearToken } from "./api";

export type LoginPayload = { email: string; password: string };

export async function login(payload: LoginPayload): Promise<{ access_token: string }> {
  const data = await api<{ access_token: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(data.access_token);
  return data;
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/login";
}
