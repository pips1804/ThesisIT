import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : res.status === 429
          ? "Too many requests. Please wait a few minutes and try again."
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);

    if (session?.access_token) {
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
        return;
      }

      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: string }).error === "string"
          ? (data as { error: string }).error
          : `Upload failed (${xhr.status})`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(formData);
  });
}
