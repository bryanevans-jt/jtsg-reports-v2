export function generateClientId(clientName: string | null | undefined): string | null {
  if (!clientName || typeof clientName !== 'string') return null;
  return clientName.toLowerCase().replace(/\s/g, '');
}

export function normalizeClientName(name: string): string {
  return name.trim();
}
