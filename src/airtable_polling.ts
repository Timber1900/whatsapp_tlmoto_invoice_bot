import Airtable from 'airtable';
import { processRecord } from './send_message';
import { sendTemplateMessage, sendTextMessage } from './metaWhatsapp';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = 'appeE8B4XA2YHvpaI';
const TABLE_NAME = 'Purchase Information';

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(BASE_ID);

export async function pollForNewRecords() {
  const recordsToSend: any[] = [];

  await base(TABLE_NAME)
    .select({
      filterByFormula: `AND(NOT({Confirmation message sent}), {Last Synced})`,
      maxRecords: 10 // adjust as needed
    })
    .eachPage(async (records, fetchNextPage) => {
      for (const record of records) {
        // Send to your webhook
        try {
            await processRecord(record, base);
            recordsToSend.push(record.id);
        } catch (err) {
          console.error(`❌ Failed to notify webhook for record ${record.id}`, err);
        }
      }

      fetchNextPage();
    });

  // Mark records as synced
  for (const id of recordsToSend) {
    await base(TABLE_NAME).update(id, {
      'Confirmation message sent': true
    });
  }

  console.log(`✅ Processed ${recordsToSend.length} new records`);
}

export async function pollForApprovedPurchases() {
    const records = await base(TABLE_NAME)
      .select({
        filterByFormula: `AND(
          {Reviewer 1 Reply Status} = 'Accepted',
          {Reviewer 2 Reply Status} = 'Accepted',
          OR({Follow-up Status} = '', NOT({Follow-up Status}))
        )`,
        maxRecords: 10
      })
      .firstPage();
  
    for (const record of records) {
      const fields = record.fields;
      const recordId = record.id;
  
      const requesterPhone = `+351${((fields['Contacto Telefónico (from Membros)'] as string[])[0] || '')}`;
      const reviewer1Phone = `+351${((fields['Contacto Telefónico (from Reviewer 1)'] as string[])[0] || '')}`;
      const reviewer2Phone = `+351${((fields['Contacto Telefónico (from Reviewer 2)'] as string[])[0] || '')}`;
      const reviewer1_name = (record.get('Nome e Sobrenome (from Reviewer 1)') as string[])[0];

      const payedBy = fields['Payed by'];
      const cost = fields['Price'] || 0;
      const iban = fields['IBAN'] || '';
  
      if (payedBy === 'TLMoto') {
        // 1. Notify requester
        await sendTextMessage({
          to: requesterPhone,
          text: '✅ Your purchase has been approved and will be paid shortly by TLMoto.'
        });
  
        // 2. Ask reviewer 1 to create payment request
        const components = [
          {
            type: 'body',
            parameters: [
              { "parameter_name": "iban", type: 'text', text: iban },
              { "parameter_name": "cost", type: 'text', text: `${cost}€` }
            ]
          }
        ];
  
        const msg1 = await sendTemplateMessage({
          to: reviewer1Phone,
          templateName: 'payment_flow_reviewer1',
          components
        });
  
        // 3. Notify reviewer 2
        await sendTextMessage({
          to: reviewer2Phone,
          text: `💬 ${reviewer1_name} is creating the payment request in the banking app.`
        });
  
        // Update Airtable
        await base(TABLE_NAME).update(recordId, {
          'Follow-up Status': 'Started',
          'Reviewer 1 Follow-up Msg ID': msg1.messages[0].id
        });
      }
  
      if (payedBy === 'Requester') {
        // 1. Send requester form with button
        const msg = await sendTemplateMessage({
          to: requesterPhone,
          templateName: 'payment_flow_requester'
        });
  
        // Update Airtable
        await base(TABLE_NAME).update(recordId, {
          'Follow-up Status': 'Started',
          'Requester Follow-up Msg ID': msg.messages[0].id
        });
      }
    }
  
    console.log(`✅ Polling: Processed ${records.length} approved records.`);
}

export async function pollForDeniedPurchases() {
  const records = await base(TABLE_NAME)
    .select({
      filterByFormula: `AND(
        OR({Reviewer 1 Reply Status} = 'Denied', {Reviewer 2 Reply Status} = 'Denied'),
        NOT({Follow-up Status} = 'Denied')
      )`,
      maxRecords: 10
    })
    .firstPage();

  for (const record of records) {
    const fields = record.fields;
    const recordId = record.id;

    const requesterPhone = `+351${((fields['Contacto Telefónico (from Membros)'] as string[])[0] || '')}`;
    const reviewer1Phone = `+351${((fields['Contacto Telefónico (from Reviewer 1)'] as string[])[0] || '')}`;
    const reviewer2Phone = `+351${((fields['Contacto Telefónico (from Reviewer 2)'] as string[])[0] || '')}`;
    const reviewer1Name = (fields['Nome e Sobrenome (from Reviewer 1)'] as string[])[0] || 'Reviewer 1';
    const reviewer2Name = (fields['Nome e Sobrenome (from Reviewer 2)'] as string[])[0] || 'Reviewer 2';
    const denialReason1 = fields['Reviewer 1 Denial Reason'] || '';
    const denialReason2 = fields['Reviewer 2 Denial Reason'] || '';

    let denialMsg = '❌ Your purchase has been denied.';
    if (denialReason1 || denialReason2) {
      denialMsg += '\n\nReasons:';
      if (denialReason1) denialMsg += `\n- ${reviewer1Name}: ${denialReason1}`;
      if (denialReason2) denialMsg += `\n- ${reviewer2Name}: ${denialReason2}`;
    }
    denialMsg += '\n\nPlease review and resubmit using the link below:';
    denialMsg += '\nhttps://airtable.com/appeE8B4XA2YHvpaI/pag1EzMs65paeDMv9/form';

    await sendTextMessage({
      to: requesterPhone,
      text: denialMsg
    });

    await sendTextMessage({
      to: reviewer1Phone,
      text: 'ℹ️ The request has been denied. The requester has been notified.'
    });

    await sendTextMessage({
      to: reviewer2Phone,
      text: 'ℹ️ The request has been denied. The requester has been notified.'
    });

    await base(TABLE_NAME).update(recordId, {
      'Follow-up Status': 'Denied'
    });
  }

  console.log(`🚫 Polling: Processed ${records.length} denied records.`);
}
