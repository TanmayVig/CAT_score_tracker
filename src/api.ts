import type { MockAttempt, MockAttemptInput, SmallTest, SmallTestInput } from "./shared/cat";

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

  if (response.status === 204) {
    return undefined as T;
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

export function deleteMock(id: number): Promise<void> {
  return request<void>(`/api/mocks/${id}`, {
    method: "DELETE"
  });
}

export function fetchSmallTests(): Promise<SmallTest[]> {
  return request<SmallTest[]>("/api/small-tests");
}

export function createSmallTest(test: SmallTestInput): Promise<SmallTest> {
  return request<SmallTest>("/api/small-tests", {
    method: "POST",
    body: JSON.stringify(test)
  });
}

export function updateSmallTest(id: number, test: SmallTestInput): Promise<SmallTest> {
  return request<SmallTest>(`/api/small-tests/${id}`, {
    method: "PUT",
    body: JSON.stringify(test)
  });
}

export function deleteSmallTest(id: number): Promise<void> {
  return request<void>(`/api/small-tests/${id}`, {
    method: "DELETE"
  });
}
