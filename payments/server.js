const express = require('express');
const Stripe = require('stripe');

const app = express();
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_KEY);

// 1. Create ad campaign payment
app.post('/create-checkout', async (req, res) => {
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
});

// 2. Webhook (THIS is critical)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const event = JSON.parse(req.body);

  if (event.type === 'checkout.session.completed') {
    console.log("PAYMENT SUCCESS → enable ad campaign");
    // activate ads in DB / NSQ / etc
  }

  res.sendStatus(200);
});

// 3. Creator payout (Stripe Connect required)
app.post('/payout', async (req, res) => {
  const { account, amount } = req.body;

  const transfer = await stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: account
  });

  res.json(transfer);
});

app.listen(4100, () => console.log("Payments running"));
