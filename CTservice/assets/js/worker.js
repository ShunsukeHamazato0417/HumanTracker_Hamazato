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
    var json = JSON.parse(msg.data);
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
  //var start = new Date();

  var send = [];
  send.push(json[0]);
  for (var i=1; i<json.length; i++){
    var data_tmp = [];
    var rad = (Math.PI/180) * json[i].direction;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    for (var j=0; j<json[i].data.length; j++){
      var tmp = [0,0];
      tmp[0] = json[i].data[j][0] * cos - json[i].data[j][1] * sin + json[i].x;
      tmp[1] = json[i].data[j][0] * sin + json[i].data[j][1] * cos + json[i].y;
      data_tmp.push(tmp);
    }
    var sensor_tmp = {
      "time"      : json[i].time,
      "x"         : json[i].x,
      "y"         : json[i].y,
      "direction" : json[i].direction,
      "data"      : data_tmp
    }
    send.push(sensor_tmp);
  }

  /*var end = new Date();
  var spend = end.getTime() - start.getTime();
  console.log('spend: ' + spend);*/

  return send;
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

