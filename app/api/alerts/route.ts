import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ pendingApprovalsCount: 0, pendingConnectionsCount: 0 });
    }

    const tenantId = session.userId;

    // Query pending submissions
    const submissionsRes = await query(
      `SELECT COUNT(*)::integer as count FROM submissions WHERE tenant_id = $1 AND status = 'pending'`,
      [tenantId]
    );

    // Query pending connections
    const connectionsRes = await query(
      `SELECT COUNT(*)::integer as count FROM tenant_connections WHERE receiver_id = $1 AND status = 'pending'`,
      [tenantId]
    );

    const pendingApprovalsCount = submissionsRes.rows[0]?.count || 0;
    const pendingConnectionsCount = connectionsRes.rows[0]?.count || 0;

    return NextResponse.json({
      pendingApprovalsCount,
      pendingConnectionsCount
    });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json({ pendingApprovalsCount: 0, pendingConnectionsCount: 0 }, { status: 500 });
  }
}
