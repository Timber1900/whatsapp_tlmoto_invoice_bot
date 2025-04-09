import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { webhookRouter } from './webhook';
import cron from 'node-cron';
import { pollForApprovedPurchases, pollForNewRecords } from './airtable_polling';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use('/meta', webhookRouter);

// // Send test message route
// app.post('/send-invoice', async (req: TypedRequestBody<WhatsAppApprovalRequest>, res)=> {
//   if (!isValidWhatsAppApprovalRequest(req.body)) {
//     res.status(400).json({ error: 'Missing or invalid fields in request body' });
//     return;
//   }

//   const { phone_reviewer_1, phone_reviewer_2, requester_name, description, invoice, invoice_name, cost } = req.body;

//   try {
//     const result1 = await sendTemplateMessage({
//       to: phone_reviewer_1,
//       templateName: 'invoice_confimartion_template',
//       "components": [
//       {
//         "type": "header",
//         "parameters": [
//           {
//             "type": "document",
//             "document": {
//               "link": invoice,
//               "filename": invoice_name
//             }
//           }
//         ]
//       },
//       {
//         "type": "body",
//         "parameters": [
//           { "parameter_name": "requester_name", "type": "text", "text": requester_name },
//           { "parameter_name": "description", "type": "text", "text": description },
//           { "parameter_name": "cost", "type": "text", "text": `${cost}€`}
//         ]
//       }
//     ]
//     });

//     const result2 = await sendTemplateMessage({
//       to: phone_reviewer_2,
//       templateName: 'invoice_confimartion_template',
//       "components": [
//       {
//         "type": "header",
//         "parameters": [
//           {
//             "type": "document",
//             "document": {
//               "link": invoice,
//               "filename": invoice_name
//             }
//           }
//         ]
//       },
//       {
//         "type": "body",
//         "parameters": [
//           { "parameter_name": "requester_name", "type": "text", "text": requester_name },
//           { "parameter_name": "description", "type": "text", "text": description },
//           { "parameter_name": "cost", "type": "text", "text": `${cost}€`}
//         ]
//       }
//     ]
//     });

//     res.json({res_req_1: result1, res_req_2: result2});
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to send message' });
//   }
// });

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
});