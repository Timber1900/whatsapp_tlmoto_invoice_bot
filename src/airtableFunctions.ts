import Airtable from 'airtable';
import { sendTextMessage } from './metaWhatsapp';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appeE8B4XA2YHvpaI');
const TABLE_NAME = 'Purchase Information';

export async function findRecordByMessageId(messageId: string) {
  const records = await base(TABLE_NAME)
    .select({
      filterByFormula: `OR(
        {Reviewer 1 Message ID} = "${messageId}",
        {Reviewer 2 Message ID} = "${messageId}",
        {Reviewer 1 Follow-up Msg ID} = "${messageId}",
        {Reviewer 2 Follow-up Msg ID} = "${messageId}",
        {Requester Follow-up Msg ID} = "${messageId}"
      )`,
      maxRecords: 1
    })
    .firstPage();
  return records[0];
}

export async function findRecordExpectingReason(phone: string) {
  phone = phone.replace(/^\+?351/, '');
  const records = await base(TABLE_NAME)
    .select({
      filterByFormula: `
      OR(
        AND({Reviewer 1 Reply Status} = "Waiting for reason", {Contacto Telefónico (from Reviewer 1)} = "${phone}"),
        AND({Reviewer 2 Reply Status} = "Waiting for reason", {Contacto Telefónico (from Reviewer 2)} = "${phone}")
      )
    `,
      maxRecords: 1
    })
    .firstPage();
  return records[0];
}

export async function updateAirtableApproval(recordId: string, messageId: string) {
  const record = await base(TABLE_NAME).find(recordId);
  const reviewer1 = record.get('Reviewer 1 Message ID');
  const reviewer2 = record.get('Reviewer 2 Message ID');
  const requesterPhone = (record.get('Contacto Telefónico (from Membros)') as string[])[0];

  const updates: any = {};
  if (reviewer1 === messageId) {
    updates['Reviewer 1 Reply Status'] = 'Accepted';
    const reviewer1_name = (record.get('Nome e Sobrenome (from Reviewer 1)') as string[])[0];

    await sendTextMessage({
      to: `+351${requesterPhone}`,
      text: `${reviewer1_name} has reviewed the payment request!`
    });
  } else if (reviewer2 === messageId) {
    updates['Reviewer 2 Reply Status'] = 'Accepted';
    const reviewer2_name = (record.get('Nome e Sobrenome (from Reviewer 2)') as string[])[0];

    await sendTextMessage({
      to: `+351${requesterPhone}`,
      text: `${reviewer2_name} has reviewed the payment request!`
    });
  }

  await base(TABLE_NAME).update(recordId, updates);
}
export async function updateAirtableDenial(recordId: string, messageId: string) {
  const record = await base(TABLE_NAME).find(recordId);
  const reviewer1 = record.get('Reviewer 1 Message ID');
  const reviewer2 = record.get('Reviewer 2 Message ID');
  const requesterPhone = (record.get('Contacto Telefónico (from Membros)') as string[])[0];

  const updates: any = {};
  if (reviewer1 === messageId) {
    updates['Reviewer 1 Reply Status'] = 'Waiting for reason';
    const reviewer1_name = (record.get('Nome e Sobrenome (from Reviewer 1)') as string[])[0];

    await sendTextMessage({
      to: `+351${requesterPhone}`,
      text: `${reviewer1_name} has reviewed the payment request!`
    });
  } else if (reviewer2 === messageId) {
    updates['Reviewer 2 Reply Status'] = 'Waiting for reason';
    const reviewer2_name = (record.get('Nome e Sobrenome (from Reviewer 2)') as string[])[0];

    await sendTextMessage({
      to: `+351${requesterPhone}`,
      text: `${reviewer2_name} has reviewed the payment request!`
    });
  }

  console.log(updates)

  await base(TABLE_NAME).update(recordId, updates);
}

export async function updateAirtableDenialReason(
  recordId: string,
  phone: string,
  followupMsgId?: string,
  reason?: string
) {
  const record = await base(TABLE_NAME).find(recordId);
  const reviewer1Phone = (record.get('Contacto Telefónico (from Reviewer 1)') as string[])[0];
  const reviewer2Phone = (record.get('Contacto Telefónico (from Reviewer 2)') as string[])[0];
  const reviewer1status = record.get('Reviewer 1 Reply Status');
  const reviewer2status = record.get('Reviewer 2 Reply Status');

  const updates: any = {};
  phone = phone.replace(/^\+?351/, '');

  if (phone === reviewer1Phone && reviewer1status === "Waiting for reason") {
    if (followupMsgId) updates['Reviewer 1 Followup Msg ID'] = followupMsgId;
    if (reason) {
      updates['Reviewer 1 Reply Status'] = 'Denied';
      updates['Reviewer 1 Denial Reason'] = reason;
    }
  } else if (phone === reviewer2Phone && reviewer2status === "Waiting for reason") {
    if (followupMsgId) updates['Reviewer 2 Followup Msg ID'] = followupMsgId;
    if (reason) {
      updates['Reviewer 2 Reply Status'] = 'Denied';
      updates['Reviewer 2 Denial Reason'] = reason;
    }
  }

  await base(TABLE_NAME).update(recordId, updates);
}