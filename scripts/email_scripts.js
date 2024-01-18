const { licensing } = require("googleapis/build/src/apis/licensing");
const { google } = require('googleapis');

const LABEL_NAME = 'BotResponse';

async function getUnrepliedMessages(auth, startTime) {
    const gmail = google.gmail({ version: 'v1', auth });
    
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: `-in:chat after:${startTime} -has:userlabels is:unread -label:${LABEL_NAME}`
    });

    return res.data.messages || [];
}


async function sendReply(auth, message) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'References'],
    });

    const subject = res.data.payload.headers.find((header) => header.name == 'Subject').value;
    const from = res.data.payload.headers.find((header) => header.name == 'From').value;

    const replyTo = from.match(/<(.*)>/)[1];
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    const replyBody = `Hi, I am currently out of the office. I will respond to any emails once I get back.\n\nBest Regards, Moinak.`;

    const rawMessage = [
        `From: me`,
        `To: ${replyTo}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${message.id}`,
        `Thread-Id: ${res.data.threadId}`,
        ``,
        replyBody
    ].join('\n');

    const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
        },
    });
}

async function createLabel(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    try {
        const res = await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
                name: LABEL_NAME,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            }
        })
        return res.data.id;
    } catch (err) {
        if (err.code === 409) {
            const res = await gmail.users.labels.list({
                userId: 'me'
            })
            const label = res.data.labels.find((label) => label.name === LABEL_NAME);
            return label.id;
        } else {
            throw err;
        }
    }
}

async function addLabel(auth, message, labelId) {

    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.messages.modify({
        id: message.id,
        userId: 'me',
        requestBody: {
            addLabelIds: [labelId],
            removeLabelIds: ['INBOX'],
        },
    });
}

module.exports = {getUnrepliedMessages,createLabel,addLabel,sendReply}