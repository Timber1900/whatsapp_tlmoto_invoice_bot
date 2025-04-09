import { AirtableBase } from 'airtable/lib/airtable_base';
import { sendTemplateMessage } from './metaWhatsapp'; // your function

interface AirtableAttachment {
  url: string;
  filename: string;
}

export async function processRecord(record: any, base: AirtableBase) {
  try {
    const phone_reviewer_1 = `+351${(record.fields['Contacto Telefónico (from Reviewer 1)'] || [])[0]}`;
    const phone_reviewer_2 = `+351${(record.fields['Contacto Telefónico (from Reviewer 2)'] || [])[0]}`;
    const requester_name = (record.fields['Nome e Sobrenome (from Membros)'] || [])[0];
    const description = record.fields['Description'] || '';

    const invoiceData = (record.fields['Invoice'] || [])[0] as AirtableAttachment;
    const invoice = invoiceData?.url || '';
    const invoice_name = invoiceData?.filename || 'invoice.pdf';

    const cost = record.fields['Full Price'] || record.fields['Price'] || 0;

    if (!phone_reviewer_1 || !phone_reviewer_2 || !invoice || !requester_name || !description) {
      console.error('❌ Missing required field(s)');
      return;
    }

    const components = [
      {
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: invoice,
              filename: invoice_name
            }
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          { "parameter_name": "requester_name", type: 'text', text: requester_name },
          { "parameter_name": "description", type: 'text', text: description },
          { "parameter_name": "cost", type: 'text', text: `${cost}€` }
        ]
      }
    ];

    console.log(components)

    const result1 = await sendTemplateMessage({
      to: phone_reviewer_1,
      templateName: 'invoice_confimartion_template',
      components
    });

    const result2 = await sendTemplateMessage({
      to: phone_reviewer_2,
      templateName: 'invoice_confimartion_template',
      components
    });

    await base('Purchase Information').update(record.id, {
      'Reviewer 1 Message ID': result1.messages[0].id,
      'Reviewer 1 Reply Status': 'Pending',
      'Reviewer 2 Message ID': result2.messages[0].id,
      'Reviewer 2 Reply Status': 'Pending',
    });

    console.log('✅ Sent to both reviewers:', result1, result2);
    return { result1, result2 };
  } catch (err) {
    console.error('❌ Failed to process record:', err);
  }
}
