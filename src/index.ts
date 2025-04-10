import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { webhookRouter } from './webhook';
import cron from 'node-cron';
import { pollForApprovedPurchases, pollForDeniedPurchases, pollForNewRecords } from './airtable_polling';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Route for webhook handling
app.use('/meta', webhookRouter);

// Default route
app.get('/', (req, res) => {
  res.send('✅ WhatsApp Business API server is running');
});

// Path to SSL certificate and key
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'cert', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'cert', 'cert.pem')),
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🚀 Server running on https://localhost:${PORT}`);
});

// Schedule cron job to poll Airtable every 3 seconds
cron.schedule('*/3 * * * * *', () => {
  console.log('⏱️ Checking Airtable for new/updated records...');
  pollForNewRecords();
  pollForApprovedPurchases();
  pollForDeniedPurchases();
});
