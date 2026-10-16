// Resolve navigation locally; reject protocol-relative and backslash-host URLs.
export function safeLoginReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  try {
    const parsed=new URL(value,'https://return.invalid');
    if(parsed.origin!=='https://return.invalid'||parsed.pathname.startsWith('/login')||parsed.pathname.startsWith('/api/'))return '/';
    return parsed.pathname+parsed.search+parsed.hash;
  } catch { return '/'; }
}
