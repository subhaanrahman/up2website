import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RvyMpGXlUXKiEJUMaXsbelhj0LiTCq9dRfT9MQNxaKTNBVmbECycewX829S4xr3wFFWxIvW703Bj4dgjsN1WVXt00qXvZtqtv';

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
