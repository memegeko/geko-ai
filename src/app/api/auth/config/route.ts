import { authConfig } from '@geko/platform';
export const dynamic='force-dynamic';
export function GET() { return Response.json(authConfig(),{headers:{'Cache-Control':'no-store'}}); }
