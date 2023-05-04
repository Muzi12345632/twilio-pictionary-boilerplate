const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');

const btnDraw = document.getElementById('btn-draw');
const btnPencil = document.getElementById('btn-pencil');
const btnEraser = document.getElementById('btn-eraser');
const pencilColor = document.getElementById('pencil-color');
const setColorBtns = document.getElementsByClassName('btn-set-color');

const txtGeneratedWord = document.getElementById('txt-generated-word');
const txtCountdownTimer = document.getElementById('txt-timer');

let isDrawing = false;
let eraserSelected = false;
let selectedColor = 'black';

let twilioSyncClient;
let lastX;
let lastY;
let buffer = [];
const bufferInterval = 100;
let bufferTimer;
let isMyTurnToDraw = false;
let timeLeft = 0;


const managePencilColor = () => {
    for (let i = 0; i < setColorBtns.length; i++) {
      setColorBtns[i].addEventListener('click', () => {
        selectedColor = setColorBtns[i].style.backgroundColor;
        pencilColor.style.backgroundColor = selectedColor;
      });
    }
  };
  
  managePencilColor();

  btnDraw.addEventListener('click', async () => {
    //clearCanvas();
    const response = await fetch('/generate-pictionary-word', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const { word } = await response.json();
    txtGeneratedWord.innerText = word;
  
    isMyTurnToDraw = true;
    startTimer();
    updateDocument('', 'start-timer');
  });
  
  btnPencil.addEventListener('click', () => eraserSelected = false);
  btnEraser.addEventListener('click', () => eraserSelected = true);
  
  const clearCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  
  const startDrawing = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    const y = (event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    isDrawing = true;
    context.beginPath();
    context.moveTo(x, y);
    lastX = x;
    lastY = y;
  };

  const draw = (event) => {
    if (isDrawing && isMyTurnToDraw && timeLeft > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
      const y = (event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
  
      context.strokeStyle = !eraserSelected ? selectedColor : 'white';
      context.lineTo(x, y);
      context.stroke();

      const line = {
        x1: lastX, y1: lastY, x2: x, y2: y, color: context.strokeStyle,
      };
    
      buffer.push(line);
  
      clearTimeout(bufferTimer);
      bufferTimer = setTimeout(flushBuffer, bufferInterval);
      lastX = x;
      lastY = y;

    }
  };

  
  const stopDrawing = () => {
    isDrawing = false;
    flushBuffer();
  };

  
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);

const checkAccessToken = () => {
    let nrOfTries = 0;
  
    const interval = setInterval(() => {
      if (accessToken !== undefined) {
        clearInterval(interval);
        startSharingTheCanvas();
      } else {
        if (nrOfTries === 20) {
          clearInterval(interval);
        }
        nrOfTries += 1;
      }
    }, 1000);
  };
  
  checkAccessToken();

  const startSharingTheCanvas = () => {
    twilioSyncClient = new Twilio.Sync.Client(accessToken);
  
    twilioSyncClient.document('canvas')
      .then((document) => {
        document.on('updated', (event) => {
          if (!event.isLocal) {
            switch (event.data.action) {
              case 'draw':
                syncCanvas(event.data);
                break;
              default:
                break;
            }
          }
        });
      })
      .catch((error) => {
        console.error('Unexpected error', error);
      });
  };

  
  const syncCanvas = (data) => {
    const lines = data.content;
    for (let i = 0; i < lines.length; i++) {
      context.beginPath();
      context.strokeStyle = lines[i].color;
      context.moveTo(lines[i].x1, lines[i].y1);
      context.lineTo(lines[i].x2, lines[i].y2);
      context.stroke();
    }
  };

  
  const flushBuffer = () => {
    if (buffer.length === 0) return;
    updateDocument(buffer, 'draw');
    buffer = [];
  };

  const updateDocument = (data, action) => {
    twilioSyncClient.document('canvas').then((doc) => {
      doc.update({ content: data, action });
    });
  };

  const startTimer = () => {
    clearCanvas();
    timeLeft = 60;
    btnDraw.disabled = true;
    const interval = setInterval(() => {
      if (timeLeft > -1) {
        txtCountdownTimer.innerText = timeLeft;
        timeLeft -= 1;
      } else {
        clearInterval(interval);
        btnDraw.disabled = false;
        isMyTurnToDraw = false;
      }
    }, 1000);
  };
  
  
