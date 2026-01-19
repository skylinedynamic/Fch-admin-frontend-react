import { loadStripe } from '@stripe/stripe-js';
import { fetchSettings } from '../modules/settings/services';

let stripePromise;

export const getStripe = async () => {
  if (!stripePromise) {
    try {
      const response = await fetchSettings();
      const settings = response.data?.data || response.data || {};
      const mode = settings.payment_mode || 'sandbox';
      const publicKey = settings[`stripe_key_${mode}`];
      
      if (!publicKey) {
        console.error(`Stripe public key not found for mode: ${mode}`);
        return null;
      }
      
      stripePromise = loadStripe(publicKey);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      return null;
    }
  }
  return stripePromise;
};
