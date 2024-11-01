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

//console.log(location.href)

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
    //var start = new Date();
    // console.log(msg.data);
    var json = JSON.parse(msg.data);
    // console.log(json);
    send_data = transformShareCordinate(json);
    //var end = new Date();
    //var tj = end.getTime() - start.getTime(); 
    //console.log('trans: ' + tj);
    self.postMessage(send_data);
    //var end2 = new Date();
    //tj = end2.getTime() - end.getTime();
    //console.log('send: ' + tj);

    /*now = new Date();
    data_t = to_date(send_data[1].time);
    lag = now.getTime() - data_t.getTime();
    console.log('lag: ' + lag);
    fps = 1000 / (now.getTime() - pre.getTime());
    console.log('fps: ' + fps);
    pre = now;*/
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


/*function sendToMain(){
  if (send_data!=null){
    self.postMessage(send_data);
  }
}
setInterval(sendToMain, 1000/20);*/


function sleep(a){
  var dt1 = new Date().getTime();
  var dt2 = new Date().getTime();
  while (dt2 < dt1 + a*1000){
    dt2 = new Date().getTime();
  }
  return;
}


function transformShareCordinate(json){

  var send = [];

  // var data_tmp = [];
  var data_history = [];
  // send.push(json);
  for (var i=0; i<json.chistory.length; i++){
    // if(json[i]){
    var data_tmp = [];
    for (var j=0; j<json.chistory[i].history.length; j++){
      var tmp = [0,0,0];
      tmp[0] = json.chistory[i].history[j][0].xy[0] + 27380;
      tmp[1] = json.chistory[i].history[j][0].xy[1] + 3560;
      tmp[2] = json.chistory[i].id;
      data_tmp.push(tmp);
    }
    data_history.push(data_tmp);
    // var sensor_tmp = {
    //   "det_time"  : json.time,
    //   "data"      : data_tmp
    // }
    // send.push(sensor_tmp);
    // console.log(send);
    // }
  }
  var sensor_tmp = {
    "det_time"  : json.time,
    "data"      : data_history
  }
  // console.log(sensor_tmp);
  // send.push(sensor_tmp);
  // console.log(send);
 
  return sensor_tmp;
}


function to_date (time){

  var year = time.year;
  var mon  = time.mon;
  var day  = time.day;
  var hour = time.hour;
  var min  = time.min;
  var sec  = time.sec;
  var mil  = time.misec;

  var t_result = new Date(year, mon-1, day, hour, min, sec, mil);
  return t_result;
}

