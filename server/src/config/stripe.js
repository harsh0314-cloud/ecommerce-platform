const Stripe = require('stripe');

// This automatically reads your STRIPE_SECRET_KEY from .env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;