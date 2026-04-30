// Returns true if the upload is allowed, false if it would exceed the storage limit.
// Fails open (returns true) on API errors to avoid blocking users due to transient issues.
export async function checkStorageAvailable(
  fileSizeBytes: number,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/subscription/storage-usage", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return true;
    const { usedBytes, limitGB } = await res.json();
    const limitBytes = limitGB * 1024 * 1024 * 1024;
    return usedBytes + fileSizeBytes <= limitBytes;
  } catch {
    return true;
  }
}
