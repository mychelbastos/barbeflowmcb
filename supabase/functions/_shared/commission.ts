const DEFAULT_COMMISSION_RATE = 0.025; // 2.5% default (Essencial)

export async function getCommissionRate(
  supabase: any,
  tenantId: string
): Promise<number> {
  const { data } = await supabase
    .from('stripe_subscriptions')
    .select('commission_rate')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.commission_rate !== null && data?.commission_rate !== undefined) {
    return Number(data.commission_rate);
  }
  return DEFAULT_COMMISSION_RATE;
}
