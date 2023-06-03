import "dotenv/config"

const { createHmac } = await import('node:crypto');
import OAuth from 'oauth-1.0a';

const oauth = OAuth({
    consumer: {
      key: process.env.CONSUMER_KEY,
      secret: process.env.CONSUMER_SECRET
    },
    signature_method: 'HMAC-SHA1',
    hash_function: (baseString, key) => createHmac('sha1', key).update(baseString).digest('base64')
  });

  export default oauth;