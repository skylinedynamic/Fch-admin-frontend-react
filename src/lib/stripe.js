import { loadStripe } from '@stripe/stripe-js/pure';

let stripePromise;

export const getStripe = async (publicKey) => {
  if (!stripePromise && publicKey) {
    try {
      stripePromise = loadStripe(publicKey);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      return null;
    }
  }
  return stripePromise;
};
