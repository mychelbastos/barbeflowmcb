/**
 * Calculate online payment discount based on tenant settings.
 * Supports per-method discounts (pix_discount_percent, card_discount_percent)
 * with fallback to the general online_discount_percent.
 */

export interface DiscountResult {
  original: number;
  final: number;
  discountPercent: number;
  discountCents: number;
}

export function getOnlineDiscount(
  settings: Record<string, any> | null | undefined,
  priceCents: number,
  paymentMethod?: 'pix' | 'card' | null
): DiscountResult {
  if (!settings) return { original: priceCents, final: priceCents, discountPercent: 0, discountCents: 0 };

  const onlineDiscount = parseFloat(settings.online_discount_percent) || 0;
  const pixDiscount = parseFloat(settings.pix_discount_percent) || 0;
  const cardDiscount = parseFloat(settings.card_discount_percent) || 0;

  let discountPercent = 0;

  if (paymentMethod === 'pix' && pixDiscount > 0) {
    discountPercent = pixDiscount;
  } else if (paymentMethod === 'card' && cardDiscount > 0) {
    discountPercent = cardDiscount;
  } else if (onlineDiscount > 0) {
    discountPercent = onlineDiscount;
  }

  const discountCents = discountPercent > 0 ? Math.round(priceCents * discountPercent / 100) : 0;

  return {
    original: priceCents,
    final: priceCents - discountCents,
    discountPercent,
    discountCents,
  };
}

/** Check if any online discount is configured */
export function hasAnyOnlineDiscount(settings: Record<string, any> | null | undefined): boolean {
  if (!settings) return false;
  return (
    (parseFloat(settings.online_discount_percent) || 0) > 0 ||
    (parseFloat(settings.pix_discount_percent) || 0) > 0 ||
    (parseFloat(settings.card_discount_percent) || 0) > 0
  );
}

/** Check if per-method discounts differ (to show separate PIX/Card prices) */
export function hasPerMethodDiscount(settings: Record<string, any> | null | undefined): boolean {
  if (!settings) return false;
  const pixDiscount = parseFloat(settings.pix_discount_percent) || 0;
  const cardDiscount = parseFloat(settings.card_discount_percent) || 0;
  return pixDiscount > 0 && cardDiscount > 0 && pixDiscount !== cardDiscount;
}
