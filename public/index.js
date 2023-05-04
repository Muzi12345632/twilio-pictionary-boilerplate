const webcamFeedContainer = document.getElementById('webcam-feed-container');
let accessToken;

const startRoom = async () => {
  const roomName = 'myRoom';
  const response = await fetch('/join-room', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomName }),
  });
  const { token } = await response.json();
  accessToken = token;

  const room = await joinVideoRoom(roomName, token);


  handleConnectedParticipant(room.localParticipant);
  room.participants.forEach(handleConnectedParticipant);
  room.on('participantConnected', handleConnectedParticipant);

  room.on('participantDisconnected', handleDisconnectedParticipant);
  window.addEventListener('pagehide', () => room.disconnect());
  window.addEventListener('beforeunload', () => room.disconnect());

};

const joinVideoRoom = async (roomName, token) => {
    try {
      const room = await Twilio.Video.connect(token, {
        room: roomName,
      });
      return room;
    } catch (error) {
      console.log('error', error);
    }
  };

  const handleConnectedParticipant = async (participant) => {
    const participantDiv = document.createElement('div');
    participantDiv.setAttribute('class', 'participantDiv mt-2');
    participantDiv.setAttribute('id', participant.identity);
    webcamFeedContainer.appendChild(participantDiv);
  
    participant.tracks.forEach((trackPublication) => {
      handleTrackPublication(trackPublication, participant);
    });
  
    participant.on('trackPublished', handleTrackPublication);
  };

  
  const handleTrackPublication = (trackPublication, participant) => {
    function displayTrack(track) {
      const participantDiv = document.getElementById(participant.identity);
      participantDiv.append(track.attach());
    }
  
    if (trackPublication.track) {
      displayTrack(trackPublication.track);
    }
  
    trackPublication.on('subscribed', displayTrack);
    Object.keys(trackPublication);
  };

  
  const handleDisconnectedParticipant = (participant) => {
    participant.removeAllListeners();
    const participantDiv = document.getElementById(participant.identity);
    participantDiv.remove();
  };
  
  startRoom();
  
