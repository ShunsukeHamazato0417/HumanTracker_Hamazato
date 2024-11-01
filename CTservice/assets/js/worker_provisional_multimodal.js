'use strict'
console.log('WebWorker activate.');

let send_data;
let send_data_c;
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
    // var json = JSON.parse(msg.data[0]);
    // console.log(JSON.parse(msg.data));
    // console.log(msg.data);
    var json_a = JSON.parse(msg.data);
    // console.log(json_a);
    // var json_c = JSON.parse(json_a[0]);
    // json_a[1] = JSON.parse(json_a[1]);
    send_data_c  = transformShareCordinate(json_a[0]);
    // console.log(send_data_c);
    json_a[0] = send_data_c;
    
    // console.log(json_a[0]);
    // console.log(json);
    // var json_c = transformShareCordinate(JSON.parse(msg.data[1]));
    // json.push(JSON.parse(msg.data[0] || "null"));
    // json.push(JSON.parse(msg.data[1] || "null"));
    // var json_c = JSON.parse(msg.data[1]);
    // console.log(json);
    // console.log(json);
    self.postMessage(json_a);
    // self.postMessage(json_c);
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

function transformShareCordinate(json){

  var send = [];

  // var data_tmp = [];
  var data_history = [];
  // send.push(json);
  for (var i=0; i<json.chistory.length; i++){
    // if(json[i]){
    var data_tmp = [];
    for (var j=0; j<json.chistory[i].history.length; j++){
      var tmp = [0,0,0,0];
      if(json.chistory[i].camera_num==2){
        var x_error = (50130-(json.chistory[i].history[j][0].xy[0] + 27570)-1040)/20;
        // if((50130-(json.chistory[i].history[j][0].xy[0] + 27570))<3000){
        //   var y_error = (0.0415*(50130-(json.chistory[i].history[j][0].xy[0] + 27570))-230)*((14110-json.chistory[i].history[j][0].xy[1] + 3580)/1250);
        // }else{
        //   var y_error = 0;
        // }
        tmp[0] = json.chistory[i].history[j][0].xy[0] + 27570 - x_error;
        tmp[1] = json.chistory[i].history[j][0].xy[1] + 3580;
        tmp[2] = json.chistory[i].id;
        tmp[3] = json.chistory[i].camera_num;
        tmp[4] = json.chistory[i].history[j][0].bounding_box;
        data_tmp.push(tmp);
      }else if(json.chistory[i].camera_num==3){
        var x_error = -(50660-(json.chistory[i].history[j][0].xy[0] + 27570)+2140)/15;
        tmp[0] = json.chistory[i].history[j][0].xy[0] + 27570 + 400 - x_error;
        tmp[1] = json.chistory[i].history[j][0].xy[1] + 3580;
        tmp[2] = json.chistory[i].id;
        tmp[3] = json.chistory[i].camera_num;
        tmp[4] = json.chistory[i].history[j][0].bounding_box;
        data_tmp.push(tmp);
      }else{
        tmp[0] = json.chistory[i].history[j][0].xy[0] + 27570;
        tmp[1] = json.chistory[i].history[j][0].xy[1] + 3580;
        tmp[2] = json.chistory[i].id;
        tmp[3] = json.chistory[i].camera_num;
        tmp[4] = json.chistory[i].history[j][0].bounding_box;
        data_tmp.push(tmp);
      }
    }
    data_history.push(data_tmp);
  }

  var distance;
  for(let i=0;i<data_history.length;i++){
    var camera_position;
    if(data_history[0][0][3]==2){
      camera_position=[50140, 13980]
    }else if(data_history[0][0][3]==3){
      camera_position=[50660, 13980]
    }else if(data_history[0][0][3]==4){
      camera_position=[79000, 10000]
    }else{
      camera_position=[73000, 31000]
    }
    for(let j=0;j<data_history[i].length;j++){
      var camera_x = data_history[i][j][0];
      var camera_y = data_history[i][j][1];
      distance = Math.sqrt(Math.pow(camera_x-camera_position[0],2) + Math.pow(camera_y-camera_position[1],2));
      // if(distance>)
    }
  }

  // console.log(data_history);
  var sensor_tmp = {
    "det_time"  : json.time,
    "data"      : data_history,
    "time_history" : json.time_history,
    "existing_id" : json.id,
    "new_existing_id" : json.new_existing_id,
    "delete_id" : json.delete_id
  }
  // send.push(sensor_tmp);
  // console.log(send);
 
  return sensor_tmp;
}

function to_date_c (time){

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