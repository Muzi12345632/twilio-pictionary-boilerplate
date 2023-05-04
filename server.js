/* eslint-disable consistent-return */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { AccessToken } = require('twilio').jwt;

const { VideoGrant, SyncGrant } = AccessToken;

const express = require('express');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const twilioClient = require('twilio')(
  process.env.TWILIO_API_KEY_SID,
  process.env.TWILIO_API_KEY_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID },
);

const pictionaryWords = ['Boat', 'Airplane', 'Car', 'Motorcycle', 'Train', 'Submarine', 'Spaceship', 'Bicycle'];


const findOrCreateRoom = async (roomName) => {
  try {
    await twilioClient.video.rooms(roomName).fetch();
  } catch (error) {
    if (error.code === 20404) {
      await twilioClient.video.rooms.create({
        uniqueName: roomName,
        type: 'group',
      });
    } else {
      throw error;
    }
  }
};

const getAccessToken = (roomName) => {
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity: uuidv4() },
  );

  const videoGrant = new VideoGrant({
    room: roomName,
  });

  const syncGrant = new SyncGrant({
    serviceSid: process.env.TWILIO_SYNC_SERVICE_SID,
  });

  token.addGrant(syncGrant);
  token.addGrant(videoGrant);

  return token.toJwt();
};

app.post('/join-room', async (req, res) => {
  if (!req.body || !req.body.roomName) {
    return res.status(400).send('Must include roomName argument.');
  }
  const { roomName } = req.body;
  findOrCreateRoom(roomName);
  const token = getAccessToken(roomName);
  res.send({
    token,
  });
});


app.get('/generate-pictionary-word', (req, res) => {
  if (pictionaryWords.length > 0) {
    const index = Math.floor(Math.random() * pictionaryWords.length);
    const word = pictionaryWords[index];
    pictionaryWords.splice(index, 1);
    res.send({
      word,
    });
  } else {
    res.send({
      word: 'There are no more pictionary words',
    });
  }
});


app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});
