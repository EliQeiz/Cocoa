import type { SupabaseClient } from '@supabase/supabase-js';

export type LiveMetric = [string, string, string, string, string];
export type LiveAlert = [string, string, string, string, string];
export type LedgerRow = [string, string, string, string, string];

export type DashboardSnapshot = {
  organizationName: string;
  operatorName: string;
  role: string;
  metrics: LiveMetric[];
  alerts: LiveAlert[];
  ledger: LedgerRow[];
  queuedSyncs: number;
  refreshedAt: Date;
};

const colors = ['#4f86ff', '#35c98d', '#ffad42', '#c77dff'];

export async function getDashboardSnapshot(client: SupabaseClient): Promise<DashboardSnapshot> {
  const { data: sessionResult, error: sessionError } = await client.auth.getUser();
  if (sessionError || !sessionResult.user) throw new Error('Sign in to load your organization data.');

  const { error: invitationError } = await client.rpc('accept_pending_invitation');
  if (invitationError) throw new Error(invitationError.message);

  const userId = sessionResult.user.id;
  const [profileResult, farmersResult, farmsResult, polygonsResult, bagsResult, lotsResult, alertsResult, purchasesResult, syncResult] = await Promise.all([
    client.from('users').select('full_name, role, organization_id, organizations(name)').eq('id', userId).maybeSingle(),
    client.from('farmers').select('*', { count: 'exact', head: true }),
    client.from('farms').select('*', { count: 'exact', head: true }),
    client.from('farm_polygons').select('*', { count: 'exact', head: true }),
    client.from('bags').select('*', { count: 'exact', head: true }),
    client.from('lots').select('lot_code, export_readiness_status'),
    client.from('risk_alerts').select('id, severity, status, recommendation, farms(name)').order('id', { ascending: false }).limit(4),
    client.from('purchases').select('id, purchased_at, sync_status, farmers(full_name, community), farms(name), bags(bag_code, weight_kg, status)').order('purchased_at', { ascending: false }).limit(5),
    client.from('sync_events').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (!profileResult.data?.organization_id) throw new Error('Your account has no active organization. Ask an owner to issue an invitation.');

  const organization = profileResult.data.organizations as unknown as { name?: string } | null;
  const fail = [farmersResult, farmsResult, polygonsResult, bagsResult, lotsResult, alertsResult, purchasesResult, syncResult]
    .find((result) => result.error)?.error;
  if (fail) throw new Error(fail.message);

  const farmCount = farmsResult.count ?? 0;
  const polygonCount = polygonsResult.count ?? 0;
  const bagCount = bagsResult.count ?? 0;
  const lots = lotsResult.data ?? [];
  const readyLots = lots.filter((lot) => lot.export_readiness_status?.toLowerCase().includes('ready')).length;
  const percent = farmCount ? Math.min(100, Math.round((polygonCount / farmCount) * 1000) / 10) : 0;
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

  const alerts: LiveAlert[] = (alertsResult.data ?? []).map((alert, index) => [
    'RA-' + String(alert.id).slice(0, 4).toUpperCase(),
    alert.recommendation || 'Compliance review required',
    (alert.farms as unknown as { name?: string } | null)?.name || 'Mapped farm',
    alert.severity || alert.status || 'Review',
    alert.severity?.toLowerCase() === 'critical' ? '#ff526c' : alert.severity?.toLowerCase() === 'high' ? '#ff6a7c' : index % 2 ? '#ffad42' : '#66c7ff',
  ]);
  const ledger: LedgerRow[] = (purchasesResult.data ?? []).map((purchase) => {
    const bag = (purchase.bags as unknown as { bag_code?: string; weight_kg?: number; status?: string }[] | null)?.[0];
    const farmer = purchase.farmers as unknown as { full_name?: string; community?: string } | null;
    return [bag?.bag_code || 'PUR-' + String(purchase.id).slice(0, 6).toUpperCase(), farmer?.community || farmer?.full_name || 'Field intake', bag?.weight_kg ? String(bag.weight_kg) + ' kg' : 'Awaiting bag', bag?.status || purchase.sync_status || 'Queued', formatDate(purchase.purchased_at)];
  });

  return {
    organizationName: organization?.name || 'AuraFlow AgriTrace',
    operatorName: profileResult.data.full_name || sessionResult.user.email?.split('@')[0] || 'Operator',
    role: profileResult.data.role || 'Operator',
    metrics: [
      ['Mapped farms', farmCount.toLocaleString(), polygonCount.toLocaleString() + ' polygons captured', 'MapPinned', colors[0]],
      ['GPS coverage', String(percent) + '%', polygonCount.toLocaleString() + ' of ' + farmCount.toLocaleString() + ' farms', 'Map', colors[1]],
      ['Bags traced', bagCount.toLocaleString(), 'Verified purchase chain', 'PackageCheck', colors[2]],
      ['Lots export-ready', String(readyLots) + ' / ' + lots.length, String(lots.length - readyLots) + ' need action', 'FileCheck2', colors[3]],
    ],
    alerts,
    ledger,
    queuedSyncs: syncResult.count ?? 0,
    refreshedAt: new Date(),
  };
}
