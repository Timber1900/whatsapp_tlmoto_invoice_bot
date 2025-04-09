import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { sendTemplateMessage, sendTextMessage } from './metaWhatsapp';
import { updateAirtableApproval, updateAirtableDenialReason, findRecordByMessageId, findRecordExpectingReason, updateAirtableDenial} from './airtableFunctions';
import Airtable from 'airtable';

dotenv.config();

export const webhookRouter = express.Router();

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appeE8B4XA2YHvpaI');
const TABLE_NAME = 'Purchase Information';

// GET for webhook verification
webhookRouter.get('/webhook', (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// POST to receive message delivery updates, replies, etc.
webhookRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const entry = req.body?.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) { res.sendStatus(200); return}

  const messageType = message.type;
  const from = message.from;
  const buttonText = message?.button?.text?.toLowerCase();
  const buttonPayload = message?.button?.payload;
  const contextId = message?.context?.id;

  try {
    console.log({ messageType, from, buttonText, buttonPayload, contextId });

    if (messageType === 'button') {
      const record = await findRecordByMessageId(contextId);
      if (!record) { res.sendStatus(200); return}

      const fields = record.fields;
      const recordId = record.id;
      const requesterPhone = `+351${((fields['Contacto Telefónico (from Membros)'] as string[])[0] || '')}`;
      const reviewer1Phone = `+351${((fields['Contacto Telefónico (from Reviewer 1)'] as string[])[0] || '')}`;
      const reviewer2Phone = `+351${((fields['Contacto Telefónico (from Reviewer 2)'] as string[])[0] || '')}`;
      
      switch (buttonText) {
        case 'confirm order':
          await updateAirtableApproval(recordId, contextId);
          break;

        case 'deny order':
          const followup = await sendTextMessage({
            to: `+${from}`,
            text: 'Please provide a short reason for denial.'
          });
          await updateAirtableDenial(recordId, contextId);
          break;

        case 'payment request created':
          await sendTextMessage({
            to: reviewer1Phone,
            text: '✅ Reviewer 2 has been notified to authorize the payment.'
          });
          const msg = await sendTemplateMessage({
            to: reviewer2Phone,
            templateName: 'payment_flow_reviewer2'
          });
          await base(TABLE_NAME).update(recordId, {
            'Reviewer 2 Follow-up Msg ID': msg.messages[0].id
          });
          break;

        case 'payment authorized':
          await sendTextMessage({
            to: reviewer1Phone,
            text: '✅ Payment has been authorized by Reviewer 2.'
          });
          await sendTextMessage({
            to: requesterPhone,
            text: '✅ Your purchase has been paid successfully. Process complete.'
          });
          await base(TABLE_NAME).update(recordId, {
            'Follow-up Status': 'Complete'
          });
          break;

        case 'payment completed':
        case 'requester-paid':
          await sendTextMessage({
            to: reviewer1Phone,
            text: '💸 The requester has completed the payment and filled the form.'
          });
          await sendTextMessage({
            to: reviewer2Phone,
            text: '💸 The requester has completed the payment and filled the form.'
          });
          await base(TABLE_NAME).update(recordId, {
            'Follow-up Status': 'Complete',
            'Requester Payment Stage': 'Done'
          });
          break;
      }
    } else if (messageType === 'text') {
      const text = message.text?.body;
      const record = await findRecordExpectingReason(from);

      if (record) {
        await updateAirtableDenialReason(record.id, from, undefined, text);
        await sendTextMessage({
          to: `+${from}`,
          text: '✅ Your reason has been recorded. Thank you.'
        });
      }
    }
  } catch (err) {
    console.error('❌ Error processing webhook:', err);
  }

  res.sendStatus(200);
});
