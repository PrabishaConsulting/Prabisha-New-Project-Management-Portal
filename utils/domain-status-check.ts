import { LiveStatus } from '@/app/generated/client';

// It checks for a basic structure like "example.com" or "sub.example.co.uk".
const isValidDomain = (domain: string) => {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

export async function checkSingleDomain(domainInput: string) {
  // FIX: Sanitize the input to handle full URLs (e.g., https://example.com/path)
  const sanitizedDomain = domainInput
    .trim()
    .replace(/^https?:\/\//, '') // Removes http:// or https://
    .split('/')[0];             // Removes any path after the domain

  // 1. Validation now uses the cleaned domain
  if (!isValidDomain(sanitizedDomain)) {
    console.error(`Invalid domain format, skipping check: ${domainInput}`);
    return { liveStatus: LiveStatus.INVALID_DOMAIN, lastChecked: new Date() };
  }

  let liveStatus: LiveStatus = LiveStatus.UNKNOWN;
  
  try {
    // All fetch calls now use the sanitized domain
    const headResponse = await fetch(`https://${sanitizedDomain}`, { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
    });
    
    if (headResponse.status === 405) {
      console.log(`HEAD not allowed for ${sanitizedDomain}. Falling back to GET.`);
      const getResponse = await fetch(`https://${sanitizedDomain}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      liveStatus = getResponse.ok ? LiveStatus.ONLINE : LiveStatus.OFFLINE;
    } else {
      liveStatus = headResponse.ok ? LiveStatus.ONLINE : LiveStatus.OFFLINE;
    }
    
  } catch (error) {
    console.error(`Failed to check domain ${sanitizedDomain}:`, error);

    const cause = (error as any)?.cause;

    // 2. Enhanced Error Handling for more accurate statuses
    if (cause?.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      liveStatus = LiveStatus.SSL_ERROR;
    } else if (cause?.code === 'ENOTFOUND') {
      liveStatus = LiveStatus.UNKNOWN;
    } else {
      liveStatus = LiveStatus.OFFLINE;
    }
  }

  return { liveStatus, lastChecked: new Date() };
}