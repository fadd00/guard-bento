const encoder = new TextEncoder();

export async function hashClientIp(ip: string, salt: string): Promise<string> {
  const data = encoder.encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export function maskHash(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
