'use strict'
console.log('WebWorker activate.');

let send_data;
let displaying;
let displaying_view;
let start = false;
var ws_req;
var now, data_t, lag;


let domain = 'ws://192.168.50.12:';
let port = '8082';
let ws_server;
let ws;
let ws_max_reconnect = 10;
let ws_try_reconnect = 0;
let ws_try_interval  = 0;
let interval = 1;
let ty;

self.addEventListener('message', (req) => {
  if (req.data.ty){
    ty = req.data.ty;
    ws_req = { 
	      ty       : ty,
        interval : interval 
    }
    ws_server = domain + port;
    ws_connect();
  } else if (req.data.command){
    if (req.data.command=='reconnect'){
      ws.close();
    } else if (req.data.command=='Forced reconnect'){
      interval++;
      ws_req = { ty : ty,
                 interval : interval }
      console.log(interval);
      ws.close();
    }
  }
});


/* ----- functions ----- */
var pre = new Date();
var fps;

function ws_connect(){
  ws = new WebSocket(ws_server);
 
  ws.onopen = function(){
    ws_try_reconnect = 0;
    ws_try_interval  = 0;
    ws.send(JSON.stringify(ws_req));
    console.log(ws_req);
    console.log('Connected to WebSocket server: ' + ws_server);
  };

  ws.onmessage = function(msg){
    //console.log(msg.data);
    var json = JSON.parse(msg.data);
    self.postMessage(json);
  };

  ws.onclose = function incoming(event){
    ws_try_reconnect++;
    ws_try_interval++;
    if (ws_try_reconnect <= 1){
      console.log('Failed connecting to WebSocket server: ' + ws_server);
    } else if (ws_try_reconnect >= ws_max_reconnect){
      console.log('WebSocket server is down.');
      return;
    }
    sleep(ws_try_interval);
    console.log('Try Reconnecting: ' + ws_try_reconnect);
    //console.log('ws close.event',event);
    //console.log('ws.readyState',ws.readyState);
    ws_connect();
  };
}


function sleep(a){
  var dt1 = new Date().getTime();
  var dt2 = new Date().getTime();
  while (dt2 < dt1 + a*1000){
    dt2 = new Date().getTime();
  }
  return;
}


function to_date (time){
  var pattern = new RegExp('([0-9]{4})/([0-9]{2})/([0-9]{2}).([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{3})', 'g');
  var result = pattern.exec(time);
  var year = Number(result[1]);
  var mon  = Number(result[2]);
  var day  = Number(result[3]);
  var hour = Number(result[4]);
  var min  = Number(result[5]);
  var sec  = Number(result[6]);
  var mil  = Number(result[7]);

  var t_result = new Date(year, mon-1, day, hour, min, sec, mil);
  return t_result;
}

