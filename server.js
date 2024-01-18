const express = require('express');

const { authorize } = require('./scripts/auth_scripts');
const {getUnrepliedMessages,createLabel,addLabel,sendReply} = require('./scripts/email_scripts');

const app = express();

let client = null;
let labelId = null;
let startTime = 1705569600;

app.use(express.json());

app.get('/login', async (req, res) => {
    try{
        client = await authorize();
        if(client == null){
            return res.json({
                "error" : "Failed to authorize"
            });
        }
        return res.json({
            "message" : "authorized successfully",
        });
    }
    catch(e){
        console.log("authorization error : ",e);
        return res.json({
            "error" : "Failed to authorize"
        });
    }
});


app.get('/reply', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if(client == null){
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({error: "Please login first"})}\n\n`);
      res.end();
      return
    }

    
    if(labelId == null) {
      try{
        labelId = await createLabel(client);
      }
      catch(e){
        console.log("error in creating/getting label : ", e);
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({error: "Error in creating or getting label"})}\n\n`);
        res.end();
      }
    }

    let intervalID = setInterval(async () => {
      try{
        const messages = await getUnrepliedMessages(client,startTime);
        if(messages.length ==0){
          res.write(`event: info\n`);
          res.write(`data: ${JSON.stringify({message: `No emails found`})}\n\n`);
        }
        else{
          for (let message of messages) {
              await sendReply(client, message);
              await addLabel(client, message, labelId)
              res.write(`event: message\n`);
              res.write(`data: ${JSON.stringify({message: `Responded to: ${message.id}`})}\n\n`);
            }
          res.write(`event: info\n`);
          res.write(`data: ${JSON.stringify({message: `Responsed to all emails`})}\n\n`);
        }
      }
      catch(e){
        console.log("error in replying to messages : ", e);
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({error: "Error in replying to messages"})}\n\n`);
        clearInterval(intervalID);
        res.end();
      }
    },getRandomInterval());

    res.on('close', () => {
        console.log('client dropped me');
        clearInterval(intervalID);
        res.end();
    });
});


function getRandomInterval() {
  return 3000
  return Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000; // Random interval between 45 and 120 seconds
}

const port = 8000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
