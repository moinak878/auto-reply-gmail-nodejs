const fs = require('fs').promises;
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const CREDENTIALS_PATH = '/home/moinak878/dev/auto-reply-gmail-nodejs/credentials.json';
const TOKEN_PATH = '/home/moinak878/dev/auto-reply-gmail-nodejs/token.json';


async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}


async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
  
    try {
      client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
      });
  
      if (client.credentials) {
        await saveCredentials(client);
      }
      console.log("authorzied successfully!");
      return client;
    } catch (e) {
      console.error('Error during authentication :', e);
      return null;
    }
}

module.exports = {authorize}