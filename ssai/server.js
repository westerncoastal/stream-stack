const express = require('express');
const Stripe = require('stripe');

const app = express();

// ⚠️ JSON only for non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

const stripe = new Stripe(process.env.STRIPE_KEY);

// 1. Create checkout
app.post('/create-checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Ad Campaign Credits'
          },
          unit_amount: 5000
        },
        quantity: 1
      }],
      success_url: `https://${process.env.DOMAIN}/success`,
      cancel_url: `https://${process.env.DOMAIN}/cancel`
    });

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).send("Checkout failed");
  }
});

// 2. 🔒 SECURE WEBHOOK
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    console.log("✅ PAYMENT VERIFIED");

    const session = event.data.object;

    // TODO: store payment / activate ads safely
    console.log("Session ID:", session.id);
  }

  res.sendStatus(200);
});

// 3. Payouts
app.post('/payout', async (req, res) => {
  try {
    const { account, amount } = req.body;

    const transfer = await stripe.transfers.create({
      amount,
      currency: 'usd',
      destination: account
    });

    res.json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Payout failed");
  }
});

app.listen(4100, () => console.log("Payments running"));
