const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Firebase को जोड़ें (यहां अपनी JSON फाइल का पूरा नाम और Database लिंक डालें)
const serviceAccount = require('./यहाँ_अपनी_JSON_फाइल_का_पूरा_नाम_पेस्ट_करें.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://आपका-प्रोजेक्ट-ना://firebaseio.com" 
});
const db = admin.database();

// 2. Razorpay को जोड़ें (यहाँ अपनी Key ID और Secret डालें)
const razorpay = new Razorpay({
  key_id: 'आपकी_RAZORPAY_KEY_ID',
  key_secret: 'आपकी_RAZORPAY_KEY_SECRET'
});

// 3. वेबसाइट से पेमेंट ऑर्डर बनाने का रास्ता
app.post('/create-order', async (req, res) => {
  try {
    const options = {
      amount: req.body.amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. पेमेंट चेक करके ESP32 को सिग्नल भेजने का रास्ता
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, slotNumber } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', 'आपकी_RAZORPAY_KEY_SECRET')
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    db.ref('vending_machine/command').set({
      dispense: true,
      slot: slotNumber,
      timestamp: Date.now()
    });
    res.json({ status: 'success', message: 'मशीन को सामान निकालने का आदेश भेज दिया गया है!' });
  } else {
    res.status(400).json({ status: 'failure', message: 'पेमेंट वेरिफिकेशन फेल हो गया!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Vending Machine Server चल रहा है...');
});
