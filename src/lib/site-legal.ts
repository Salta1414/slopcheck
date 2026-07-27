/**
 * Legal / operator details for Impressum & privacy.
 * Override via NEXT_PUBLIC_LEGAL_* if needed.
 */
export const siteLegal = {
  productName: "Slopcheck",
  priceLabel: "€5",
  supportEmail:
    process.env.NEXT_PUBLIC_LEGAL_EMAIL ??
    "domenic.wehkamp@zyntra-group.com",
  operator: {
    name: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "Domenic Wehkamp",
    street: process.env.NEXT_PUBLIC_LEGAL_STREET ?? "Südeschstraße 40",
    zipCity: process.env.NEXT_PUBLIC_LEGAL_CITY ?? "48429 Rheine",
    country: process.env.NEXT_PUBLIC_LEGAL_COUNTRY ?? "Deutschland",
    phone: process.env.NEXT_PUBLIC_LEGAL_PHONE ?? undefined,
  },
  isComplete: true,
} as const;
