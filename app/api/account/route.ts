import { accountInfo } from '@geko/platform';
export const dynamic='force-dynamic';
export async function GET() { const account=await accountInfo();return Response.json(account||{error:'UNAUTHORIZED'},{status:account?200:401,headers:{'Cache-Control':'private, no-store'}}); }
