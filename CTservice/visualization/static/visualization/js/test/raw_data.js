const canvas = document.createElement('canvas');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight
canvas.style.width = '100%';
canvas.style.height = '100%';
document.body.appendChild(canvas);

const offscreen = canvas.transferControlToOffscreen();


var connection = new WebSocket('ws://192.168.50.12:8081');
var worker = new Worker('/static/visualization/js/test/worker.js');
console.log(worker);
console.log(offscreen);

worker.postMessage({
  canvas: offscreen,
  width: window.innerWidth,
  height: window.innerHeight
}, [offscreen]);

connection.onopen = function(event) {
  console.log('Connected to server.');
};

connection.onerror = function(event) {
  console.log('Connection error!')
};

connection.onmessage = function(msg) {
  var json = JSON.parse(msg.data);
  //console.log(json[1].time);
};



