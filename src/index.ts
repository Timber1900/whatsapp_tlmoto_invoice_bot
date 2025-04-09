import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { webhookRouter } from './webhook';
import cron from 'node-cron';
import { pollForApprovedPurchases, pollForDeniedPurchases, pollForNewRecords } from './airtable_polling';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use('/meta', webhookRouter);

app.get('/', (req, res) => {
  res.send('✅ WhatsApp Business API server is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

cron.schedule('*/0.05 * * * *', () => {
  console.log('⏱️ Checking Airtable for new/updated records...');
  pollForNewRecords();
  pollForApprovedPurchases();
  pollForDeniedPurchases();
});