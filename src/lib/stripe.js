import { loadStripe } from '@stripe/stripe-js/pure';

const stripePromises = {};

export const getStripe = async (publicKey) => {
  const key = publicKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.warn('[getStripe] No publishable key available.');
    return null;
  }
  if (!stripePromises[key]) {
    try {
      stripePromises[key] = loadStripe(key);
    } catch (error) {
      console.error('[getStripe] Error initializing Stripe:', error);
      return null;
    }
  }
  return stripePromises[key];
};
