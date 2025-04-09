import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

console.log(WHATSAPP_TOKEN)

export async function sendTemplateMessage({
  to,
  templateName,
  language = 'en',
  components = []
}: {
  to: string;
  templateName: string;
  language?: string;
  components?: any[];
}) {
  const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
          name: templateName,
          language: { code: language },
          components
        }
    };

  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(url, payload, { headers });
    console.log('✅ Message sent:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    throw error;
  }
}
export async function sendTextMessage({
  to,
  text
}: {
  to: string;
  text: string;
}) {
  const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: text
    }
  };

  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    const res = await axios.post(url, payload, { headers });
    console.log('✅ Text message sent:', res.data);
    return res.data;
  } catch (err: any) {
    console.error('❌ Failed to send text message:', err.response?.data || err.message);
    throw err;
  }
}
