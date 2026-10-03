const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function endpoint(path) {
  if (!API_URL) {
    throw new Error(
      "VITE_API_URL is not configured. Copy .env.example to .env and set the API URL.",
    );
  }

  return `${API_URL}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(endpoint(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: "The API returned an invalid JSON response." };
    }
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function getNotices() {
  return request("/notices");
}

export function createNotice(notice) {
  return request("/notices", {
    method: "POST",
    body: JSON.stringify(notice),
  });
}

export function updateNotice(id, notice) {
  return request(`/notices/${id}`, {
    method: "PUT",
    body: JSON.stringify(notice),
  });
}

export function deleteNotice(id) {
  return request(`/notices/${id}`, {
    method: "DELETE",
  });
}
