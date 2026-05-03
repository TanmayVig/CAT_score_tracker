import type { MockAttempt, MockAttemptInput } from "./shared/cat";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export function fetchMocks(): Promise<MockAttempt[]> {
  return request<MockAttempt[]>("/api/mocks");
}

export function createMock(mock: MockAttemptInput): Promise<MockAttempt> {
  return request<MockAttempt>("/api/mocks", {
    method: "POST",
    body: JSON.stringify(mock)
  });
}

export function updateMock(id: number, mock: MockAttemptInput): Promise<MockAttempt> {
  return request<MockAttempt>(`/api/mocks/${id}`, {
    method: "PUT",
    body: JSON.stringify(mock)
  });
}
