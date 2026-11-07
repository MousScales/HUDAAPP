/**
 * Stripe configuration for donations.
 * Add your publishable key here once ready — secret key goes in Firebase Functions env.
 *
 * Firebase setup:
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 * Or set STRIPE_SECRET_KEY in your Firebase Functions environment.
 */

export const STRIPE_CONFIG = {
  publishableKey: 'pk_live_51Te3Sf8WiSPgtGxp8uQPCcuptjUbMeHIY2qH5NyIeTrlZ9Szr2JqWRMt4qF0HjKLK1YS1c9oggpqO5zDmOmaA2Bn00h9Rn2kAS',

  // Optional: pre-made Stripe Payment Links per amount (works without a backend).
  // Example: '500': 'https://buy.stripe.com/...'
  paymentLinks: {},

  currency: 'usd',
  minAmountCents: 100,
  presetAmountsCents: [500, 1000, 2500, 5000],
};

export function isStripeConfigured() {
  const hasPublishableKey =
    typeof STRIPE_CONFIG.publishableKey === 'string' &&
    STRIPE_CONFIG.publishableKey.startsWith('pk_');

  const hasPaymentLinks = Object.values(STRIPE_CONFIG.paymentLinks).some(
    (link) => typeof link === 'string' && link.startsWith('https://')
  );

  return hasPublishableKey || hasPaymentLinks;
}
