import { loadStripe } from '@stripe/stripe-js';

// TODO: Replace with your real Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_PLACEHOLDER';

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
