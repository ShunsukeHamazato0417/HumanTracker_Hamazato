'use strict'

/**************************************
* Library
**************************************/

// Other's libraries
//const server       = require('ws').Server;
import { readFileSync } from 'fs';
import pkg from 'ws';
  const {Server} = pkg;

// My libraries
import { client } from './mylib/client/client.mjs';
import { consumer } from './mylib/kafka/consumer.mjs';
import { camera } from './mylib/tool/camera.mjs';
import { sensor } from './mylib/tool/sensor.mjs';

/**************************************
* Main
**************************************/

/*** Read config ***/
const config = JSON.parse(readFileSync('./conf/config.json', 'utf8'));
// websocket config
const ws_address = config.server.address;
const ws_port    = config.server.port;
// sensor config
const sensor_n = config.sensor.num;
const fps = config.sensor.fps;
const sensors = [null];
for (const s of config.sensor.sensors){
  sensors.push(new sensor(s.id, s.ip, s.x, s.y, s.direction));
}
// camera config
const camera_n = config.camera.num;
const fps_c = config.camera.fps;
const cameras = [null];
for (const s of config.camera.cameras){
  cameras.push(new camera(s.id, s.x, s.y, s.direction));
}
let camera_fps = 0;
// console.log(cameras)
// kafka config
var kafka_servers = "";
for (const s of config.kafka.bootstrap_servers){
  kafka_servers = kafka_servers + s + ',';
}
const topics = config.kafka.topics;


/*** websocket server ***/ 
var connections = [];
var connections_multimodal = [];

const wss = new Server({
	port : ws_port,
	perMessageDeflate : {
	  zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
          },
          zlibInflateOptions: {
            chunkSize: 10 * 1024
          },
          clientNoContextTakeover: true, 
          serverNoContextTakeover: true, 
          serverMaxWindowBits: 10,
          concurrencyLimit: 10, 
          threshold: 1024 
	}
});


wss.on('connection', function(ws){
  var cl;

  ws.on('message', function(msg){
    var t = JSON.parse(msg);
    cl = new client(ws, t.ty);
    connections.push(cl);
    console.log(`WebSocket: Connected ${cl._datatype} client`);
  });

  ws.on('close', function(){
    console.log(`WebSocket: Disconnected ${cl._datatype} client`);
    connections = connections.filter(function (con, i) {
      return (con === cl) ? false : true;
    });
  });
});


/*** sending data ***/
var send_raw_data = Array(sensor_n + 1);
var send_remove_bg_data = Array(sensor_n + 1);
var send_integrated_remove_bg_data = Array(sensor_n + 1);
var send_dbscan_cluster_data;
var send_detected_data;
var send_provisional_detected_data;
var send_camera_data = Array(camera_n + 1);
var send_mot_data = Array(camera_n + 1);
var send_NN_mot_data = Array(camera_n + 1);
var send_multimodal_data = Array(2);
var send_multimodal_new_data = Array(2);
var send_provisional_multimodal_data = Array(2);
var send_camera_history_data;
var send_history_multimodal_data = Array(2);
var send_history_multimodal_data_sub = Array(2);

var time_c;
var time_d;
var time_c_first=0;
var time_d_first=0;
var queue_c = [];
var queue_d = [];

var camera_history = [];
var existing_id = [];
var time_history = [];
var chistory = [];

function broadcast(types){
  var msg = "";
  if (types[0]=="all"){
    connections.forEach(function (con, i){
      eval("msg = send_"+con._datatype+";")
      con._ws.send(JSON.stringify(msg));
      // if(con._datatype=="multimodal_data"){

      // }else{
      //   con._ws.send(JSON.stringify(msg));
        
      // }
      
    });
  }
   else {
    connections.forEach(function (con, i){
      if (con._datatype in types){
        eval("msg = send_"+con._datatype+";")
        if(con._datatype=="multimodal_data"){
          // con._ws.send(msg);
        }else{
          con._ws.send(JSON.stringify(msg));
        }
        // con._ws.send(JSON.stringify(msg));
      }
    });
  }
};

var send_datatype = ["all"];
setInterval(broadcast, 50, send_datatype);


function broadcast_multimodal(types){
  var msg = "";

  connections.forEach(function (con, i){
    eval("msg = send_"+con._datatype+";")
    
    if(con._datatype=="multimodal_data"){
      con._ws.send(JSON.stringify(msg));
      // console.log("multimodal_data");
    }else{
      
    }
    // con._ws.send(JSON.stringify(msg));
  });
  
};
// setInterval(broadcast_multimodal, 100, send_datatype);



function make_send_multimodal_data(types){
  // console.log(send_mot_data);
  if(send_detected_data != null && send_mot_data[2] != null){
    time_c = to_date_c(send_mot_data[2].det_time);
    time_d = to_date(send_detected_data.time);
    // console.log("camera time:")
    // console.log(time_c)
    // console.log(time_d)
    send_multimodal_data[0] = send_mot_data
    send_multimodal_data[1] = send_detected_data
    // console.log((time_c.getTime()-time_d.getTime() - 1800));
    // if(time_c.getTime()-time_d.getTime() - 1800 < 0){
      // console.log("lidar_delay");
    send_multimodal_new_data = send_multimodal_data
  }
}
setInterval(make_send_multimodal_data, 100, send_datatype);


function make_send_history_multimodal_data(types){
  // if(send_detected_data != null && send_camera_history_data != null){
  //   send_history_multimodal_data_sub[0]=send_camera_history_data;
  //   send_history_multimodal_data_sub[1]=send_detected_data;
  // }
  if(send_detected_data && send_camera_history_data){
    // ライダーの最新のデータ取得時刻をtime_d_firstに
    if(time_d_first == 0){
      time_d_first=to_date(send_detected_data.time).getTime();
    }

    // 同様にカメラの最新の
    if(time_c_first == 0){
      time_c_first = to_date_c(send_camera_history_data.time).getTime();
    }

    time_c = to_date_c(send_camera_history_data.time);
    var time_camera = time_c.getTime();
    time_d = to_date(queue_d[queue_d.length-1].time);
    var time_lidar =time_d.getTime();
    
    var min = 9999;  //最大9999ミリ秒まで許容
    var index = 0;  //何番目の測域センサデータを扱うか 
    var time;
    var msg_d;
    for(let i=queue_d.length-1;i>0;i--){
      time_d = to_date(queue_d[i].time);
      if(Math.abs(time_c.getTime() - time_d.getTime())<min){
        min = Math.abs(time_c.getTime() - time_d.getTime())
        index=i;
      }
    }
    console.log(index);
    // ここから評価のための改造
    // console.log(queue_d.length);

    send_provisional_multimodal_data[0]=send_camera_history_data;
    send_provisional_multimodal_data[1]=queue_d[index];
    send_history_multimodal_data_sub[0]=send_camera_history_data;
    send_history_multimodal_data_sub[1]=queue_d[index];

    // if(queue_d[0]==null){

    // }else{
    //   for (let i = 0; i < queue_d.length; i++){
    //     if(queue_d[i]==null){
        
    //     }else{
    //       // console.log(JSON.stringify(queue[i]));
    //       msg_d = queue_d[i];
    //       // console.log(JSON.stringify(msg_det));
    //       time = to_date(msg_d.time);
    //       // console.log(time);
    //       var time_qd = time.getTime();
    //       // var distance = Math.abs(time_camera - time_qd - 1800);//timeの差リアルタイム用
    //       var distance = Math.abs(time_camera + 400 - time_qd);//検証用
    //       if (distance < min){
    //         min = distance;
    //         index = i;
    //       }
    //     }
    //   }
    //   console.log(index);
    //   console.log(min);
    //   if (queue_d[index] == null){
    //     console.log("ミス")
    //   }else{
    //     var msg_c = send_camera_history_data;
    //     var msg_qd = queue_d[index];
        
    //     send_provisional_multimodal_data[0]=msg_c;
    //     send_provisional_multimodal_data[1]=msg_qd;
    //     send_history_multimodal_data_sub[0]=msg_c;
    //     send_history_multimodal_data_sub[1]=msg_qd;
        
    //   }
    // }
  }
  

  // }else{
  //   if(time_d_first == 0){
  //     time_d_first=to_date(send_detected_data.time).getTime();
  //   }
  //   if(queue_c[0] == null){

  //   }else{
      
  //     // if(time_c_first == 0){
  //     //   time_c_first = to_date_c(queue_c[0].time).getTime()-time_d_first;
  //     // }
      
  //     time_c = to_date_c(send_camera_history_data.time);//検証のため変更している
  //     // time_c = to_date_c(queue_c.slice(-1)[0].time);
  //     time_d = to_date(send_detected_data.time);
      
  //     // console.log(time_c.getTime() - 1800 - time_d.getTime());
  //     if(time_c.getTime() - 1800 - time_d.getTime() < 0){
  //       // console.log("lidar_delay");
  //       time_c = to_date_c(send_camera_history_data.time);
  //       var time_camera = time_c.getTime();
  //       var min = 9999;  //最大9999ミリ秒まで許容
  //       var index = 0;  //何番目のカメラデータを扱うか 
  //       var time;
  //       var msg_d;
  //       if(queue_d[0]==null){

  //       }else{
  //         for (let i = 0; i < queue_d.length; i++){
  //           if(queue_d[i]==null){
            
  //           }else{
  //             // console.log(JSON.stringify(queue[i]));
  //             msg_d = queue_d[i];
  //             // console.log(JSON.stringify(msg_det));
  //             time = to_date(msg_d.time);
  //             // console.log(time);
  //             var time_qd = time.getTime();
  //             // var distance = Math.abs(time_camera - time_qd - 1800);//timeの差リアルタイム用
  //             var distance = Math.abs(time_camera - 1800 - time_qd);//検証用
  //             if (distance < min){
  //               min = distance;
  //               index = i;
  //             }
  //           }
  //         }
  //         console.log(index);
  //         console.log(min);
  //         if (queue_d[index] == null){

  //         }else{
  //           var msg_c = send_camera_history_data;
  //           var msg_qd = queue_d[index];
            
  //           send_history_multimodal_data[0]=msg_c;
  //           send_history_multimodal_data[1]=msg_qd;
            
  //         }
  //       }
  //     }else{
  //       // console.log("camera_delay");
  //       time_d = to_date(send_detected_data.time);
  //       var time_detected = time_d.getTime();
  //       var min = 9999;  //最大9999ミリ秒まで許容
  //       var index = 0;  //何番目のカメラデータを扱うか 
  //       var time;
  //       var msg_c;
  //       if(queue_c[0]==null){

  //       }else{
  //         for (let i = 0; i < queue_c.length; i++){
  //           if(queue_c[i] == null){
            
  //           }else{
              
  //             msg_c = queue_c[i];
              
  //             time = to_date_c(msg_c.time);
              
  //             // var time_qc = time.getTime(); //リアルタイム用
  //             var time_qc = time.getTime()-1800;//検証用
              
  //             // var distance = Math.abs(time_detected - time_qc +1800);//timeの差 リアルタイム用
  //             var distance = Math.abs(time_detected - time_qc);
  //             // console.log(distance);
  //             if (distance < min){
  //               min = distance;
  //               index = i;
  //             }
  //           }
  //         }
  //         console.log(index);
  //         console.log(min);
  //         if (queue_c[index] == null){

  //         }else{
  //           var msg_d = send_detected_data;
  //           var msg_qc = queue_c[index];
  //           // console.log(msg_qc.time);
  //           send_history_multimodal_data[0]=msg_qc;
  //           send_history_multimodal_data[1]=msg_d;
  //         }
  //       }
  //     }
  //   }
  // }
  // send_history_multimodal_data_sub=send_history_multimodal_data;
  // send_provisional_multimodal_data = send_history_multimodal_data;

  // // console.log(send_history_multimodal_data);
}
setInterval(make_send_history_multimodal_data, 50, send_datatype);


// カメラ用時間変換
function to_date_c (det_time){
  var year = det_time.year;
  var mon  = det_time.mon;
  var day  = det_time.day;
  var hour = det_time.hour;
  var min  = det_time.min;
  var sec  = det_time.sec;
  var mil  = det_time.misec / 1000;

  var t_result = new Date(year, mon-1, day, hour, min, sec, mil);
  // var t_result = new Date(year, mon-1, day, hour, min, sec);
  return t_result;
}


// センサ用の時間変換
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






/*** kafka connection ***/
// raw_data
const raw_data_consumer = 
  new consumer(kafka_servers, "raw_data", topics.raw_data, "wss-raw_data2")._consumer();
  raw_data_consumer.on('connect', function(){ console.log(`Kafka: Connected raw_data topics.`); });
  raw_data_consumer.on('error', onError);
  raw_data_consumer.on('message', onSensorData);
// remove_bg_data
const remove_bg_data_consumer = 
  new consumer(kafka_servers, "remove_bg_data", topics.remove_bg_data, "wss-remove_bg_data2")._consumer();
  //new consumer(kafka_servers, "remove_bg_data", topics.aggregated_remove_bg_data, "wss-remove_bg_data")._consumer();
  remove_bg_data_consumer.on('connect', function(){ console.log(`Kafka: Connected remove_bg_data topics.`); });
  remove_bg_data_consumer.on('error', onError);
  remove_bg_data_consumer.on('message', onSensorData);
  //remove_bg_data_consumer.on('message', onAggregatedSensorData);
// integrated_remove_bg_data
const integrated_remove_bg_data_consumer = 
  new consumer(kafka_servers, "integrated_remove_bg_data", topics.integrated_remove_bg_data, "wss-integrated_remove_bg_data2")._consumer();
  integrated_remove_bg_data_consumer.on('connect', function(){ console.log(`Kafka: Connected integrated_remove_bg_data topics.`); });
  integrated_remove_bg_data_consumer.on('error', onError);
  integrated_remove_bg_data_consumer.on('message', onSensorData);
// dbscan_cluster_data
const dbscan_cluster_data_consumer = 
  new consumer(kafka_servers, "cluster_data", topics.dbscan_cluster_data, "wss-cluster_data2")._consumer();
  dbscan_cluster_data_consumer.on('connect', function(){ console.log(`Kafka: Connected dbscan_cluster_data topics.`); });
  dbscan_cluster_data_consumer.on('error', onError);
  dbscan_cluster_data_consumer.on('message', onClusterData);
// detected_data
const detected_data_consumer = 
  new consumer(kafka_servers, "detected_data", topics.detected_data, "wss-detected_data2")._consumer();
  detected_data_consumer.on('connect', function(){ console.log(`Kafka: Connected detected_data topics.`); });
  detected_data_consumer.on('error', onError);
  detected_data_consumer.on('message', onDetectedData);

// camera_data
const camera_data_consumer = 
  new consumer(kafka_servers, "bytra", topics.bytra, "wss-camera_data")._consumer();
  camera_data_consumer.on('connect', function(){ console.log(`Kafka: Connected bytra topics.`); });
  camera_data_consumer.on('error', onError);
  camera_data_consumer.on('message', onCameraData);

const mot_data_consumer = 
  new consumer(kafka_servers, "mot", topics.mot, "wss-mot_data")._consumer();
  mot_data_consumer.on('connect', function(){ console.log(`Kafka: Connected mot topics.`); });
  mot_data_consumer.on('error', onError);
  mot_data_consumer.on('message', onMotData);

/*const kclient = new KafkaClient({
  kafkaHost: kafka_servers
});
const cluster_data_consumer = new Consumer(kclient,
  [
    {topic: topics.dbscan_cluster_data}
  ],
  {
    autoCommit: false
  });
  cluster_data_consumer.on('connect', function(){ console.log(`Kafka: Connected dbscan_cluster_data topics.`); });
  cluster_data_consumer.on('error', onError);
  cluster_data_consumer.on('message', onClusterData);*/



// onMessage function
function onSensorData(message){
  var json = JSON.parse(message.value);
  var code  = "send_"+json.tag+"[json.id]={";
      code +=   "\"time\" : json.time,";
      code +=   "\"id\" : json.id,";
      code +=   "\"x\" : sensors[json.id]._x,";
      code +=   "\"y\" : sensors[json.id]._y,";
      code +=   "\"direction\" : sensors[json.id]._direction,"
      code +=   "\"data\" : json.data }";
  // console.log(code);
  eval(code);
  // console.log(json);
};

function onAggregatedSensorData(message){
  var json = JSON.parse(message.value);
  for (var j of json.data){
    var code  = "send_remove_bg_data[j.id]={";
        code +=   "\"time\" : j.time,";
        code +=   "\"id\" : j.id,";
        code +=   "\"x\" : 0,";
        code +=   "\"y\" : 0,";
        code +=   "\"direction\" : 0,"
        code +=   "\"data\" : j.data }";
    eval(code);
  }
  //console.log(code);
  eval(code);
};

function onClusterData(message){
  //console.log(JSON.parse(message.value));
  send_dbscan_cluster_data = JSON.parse(message.value);
};

function onDetectedData(message){
  //console.log(JSON.parse(message.value));
  try {
    send_detected_data = JSON.parse(message.value);
    // console.log(send_detected_data);
    send_provisional_detected_data = send_detected_data;
    // console.log(to_date(send_detected_data.time).getTime());
    if(send_detected_data){
      queue_d.push(send_detected_data);
    }
    if (queue_d.length>55){
      queue_d.shift();
    }
  }catch (e){
    console.log(e);
  }
};

// bytra用
function onCameraData(message){
  var jsonc = JSON.parse(message.value);
  console.log(jsonc);
  var code  = "send_camera_data"+"[jsonc.num_cam]={";
      code +=   "\"det_time\" : jsonc.det_time,";
      code +=   "\"id\" : jsonc.num_cam,";
      code +=   "\"x\" : cameras[jsonc.num_cam]._x,";
      code +=   "\"y\" : cameras[jsonc.num_cam]._y,";
      // code +=   "\"direction\" : 0,"
      code +=   "\"data\" : jsonc.det_hum }";
  // console.log(code);
  eval(code);
  console.log(jsonc);
  var now =new Date();
  // console.log(now.getTime() - to_date_c(send_camera_data[3].det_time).getTime());
  // if(send_camera_data[2] == null){

  // }else{
  //   let msg = JSON.parse(JSON.stringify(send_camera_data));
  //   queue_c.push(msg);
  // }
  // if (queue_c.length>60){
  //   queue_c.shift();
  // }
  
  var delete_id = [];
  delete_id.splice(0)
  for (let i = 0;i<chistory.length;i++){
    chistory[i].existing_count++;
    if(chistory[i].existing_count>2){
      delete_id.push(existing_id[i]);
      chistory.splice(i,1);
      existing_id.splice(i,1);
      i--;
      // delete_id.push(existing_id[i]);
    }
  }
  // for(let j=delete_id_num.length-1; j>-1; j--){
  //   // existing_id.splice(delete_id_num[j],1);
  //   // chistory.splice(delete_id_num[j],1);
  // }
  var time;
  if(send_camera_data[3]){
    time=send_camera_data[3].det_time;
  }else{
    time=send_camera_data[2].det_time;
  }
  var new_existing_id =[];
  if(send_camera_data){
    time_history.push(time);
    if(time_history.length>6){time_history.shift();}
    for(let j = 0; j < send_camera_data.length; j++){
      
      if(send_camera_data[j]){
        for(let i = 0;i<send_camera_data[j].data.length;i++){
          if(existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id)>-1){
            if(chistory[existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id)].history.length == 2){
              new_existing_id.push(send_camera_data[j].data[i].bytetrack_id);
            }
          }
          if(existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id) == -1){
            existing_id.push(send_camera_data[j].data[i].bytetrack_id);
            chistory.push({"id" : send_camera_data[j].data[i].bytetrack_id, "history" : [send_camera_data[j].data[i]], "existing_count" : 0});
            // if(existing_id.length>20){
            //   existing_id.shift();
            // }
            // if(chistory.length>20){
            //   chistory.shift();
            // }
          }else{
            chistory[existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id)].history.push(send_camera_data[j].data[i]);
            chistory[existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id)].existing_count = 0;
            if(chistory[existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id)].history.length>10){
              chistory[existing_id.indexOf(send_camera_data[j].data[i].bytetrack_id)].history.shift();
            }
          }
        }
      }
    }
  }
  // console.log(existing_id);
  
  // if(chistory[0]){console.log(chistory[0].history.length);}
  send_camera_history_data = {
    time : time,
    time_history : time_history,
    id : existing_id,
    chistory : chistory,
    new_existing_id : new_existing_id,
    delete_id : delete_id
  }
  // queue_c.push(send_camera_history_data);
  // // console.log(queue_c.length);
  // if(queue_c.length>100){
  //   queue_c.shift();  
  // }
  // if(queue_c[0]){
  //   console.log(queue_c[0].time);
  //   console.log(queue_c.slice(-1)[0].time);
  // }
  

  // console.log(send_camera_history_data.new_existing_id);
  // console.log(send_camera_history_data.id);
  // console.log(delete_id);
  
};

// mot用
function onMotData(message){
  // camera_fps++;
  var jsonc = JSON.parse(message.value);
  // console.log(jsonc);
  // if(jsonc.people[4]){
  //   console.log(jsonc.people[4]);
  // }
  // for(let i=0;i<jsonc.people.length;i++){
  //   if(jsonc.people[i].detects.length>=2){
  //     console.log(jsonc.people[i].detects);
  //   }
  //   console.log(jsonc.people[i].detects);
  // }
  // console.log(jsonc);
  var code  = "send_mot_data"+"[jsonc.camera-1]={";
      code +=   "\"det_time\" : jsonc.time,";
      code +=   "\"id\" : jsonc.camera,";
      code +=   "\"x\" : cameras[jsonc.camera]._x,";
      code +=   "\"y\" : cameras[jsonc.camera]._y,";
      code +=   "\"camera_num\" : jsonc.camera,";
      code +=   "\"data\" : jsonc.people }";
  eval(code);
  
  // send_NN_mot_data =send_mot_data;
  // for(let i=0;i<send_NN_mot_data.length;i++){
  //   if(send_NN_mot_data[i]){
  //     for(let j=0;j<send_NN_mot_data[i].data.length;j++){
  //       // console.log(send_NN_mot_data[i].data[j].detects);
  //       const input = new Float32Array([send_NN_mot_data[i].data[j].xy[0],send_NN_mot_data[i].data[j].xy[1]]);
  //     }
  //     // console.log(send_NN_mot_data[i].data[j].detects);
  //   }
  // }
  
  var delete_id = [];
  var send_chistory=[];
  var send_NN_chistory=[];
  delete_id.splice(0)
  // delete_countが5以上のchistoryを削除
  for (let i = 0;i<chistory.length;i++){
    chistory[i].delete_count++;
    if(chistory[i].delete_count>2){
      delete_id.push(existing_id[i]);
      chistory.splice(i,1);
      existing_id.splice(i,1);
      i--;
      // delete_id.push(existing_id[i]);
    }
  }
  // for(let j=delete_id_num.length-1; j>-1; j--){
  //   // existing_id.splice(delete_id_num[j],1);
  //   // chistory.splice(delete_id_num[j],1);
  // }
  var time;
  // if(send_mot_data[3]){
  //   time=send_mot_data[3].det_time;
  // }else{
  //   time=send_mot_data[2].det_time;
  // }
  for(let i=0;i<send_mot_data.length;i++){
    if(send_mot_data[i]){
      time=send_mot_data[i].det_time;
    }
  }
  var new_existing_id =[];
  if(send_mot_data){
    time_history.push(time);
    if(time_history.length>10){time_history.shift();}
    for(let j = 0; j < send_mot_data.length; j++){
      
      if(send_mot_data[j]){
        for(let i = 0;i<send_mot_data[j].data.length;i++){
          if(existing_id.indexOf(send_mot_data[j].data[i].id)>-1){
            if(chistory[existing_id.indexOf(send_mot_data[j].data[i].id)].history.length == 2){
              new_existing_id.push(send_mot_data[j].data[i].id);
            }
          }
          if (existing_id.indexOf(send_mot_data[j].data[i].id) == -1){
            existing_id.push(send_mot_data[j].data[i].id);
            chistory.push({"id" : send_mot_data[j].data[i].id, "history" : [send_mot_data[j].data[i].detects], "delete_count" : 0, camera_num : send_mot_data[j].camera_num, "existing_count":1});
            // if(existing_id.length>20){
            //   existing_id.shift();
            // }
            // if(chistory.length>20){
            //   chistory.shift();
            // }
          }else{
            chistory[existing_id.indexOf(send_mot_data[j].data[i].id)].history.push(send_mot_data[j].data[i].detects);
            chistory[existing_id.indexOf(send_mot_data[j].data[i].id)].delete_count = 0;
            chistory[existing_id.indexOf(send_mot_data[j].data[i].id)].existing_count++;
            if(chistory[existing_id.indexOf(send_mot_data[j].data[i].id)].history.length>15){
              chistory[existing_id.indexOf(send_mot_data[j].data[i].id)].history.shift();
            }
          }
        }
      }
    }
  }
  
  for(let i=0;i<chistory.length;i++){
    if(chistory[i].existing_count>7){
      send_chistory.push(chistory[i]);
    }
  }
  // console.log(send_chistory);
  // if(chistory[0]){console.log(chistory[0].history.length);}
  send_camera_history_data = {
    time : time,
    time_history : time_history,
    id : existing_id,
    chistory : send_chistory,
    new_existing_id : new_existing_id,
    delete_id : delete_id,
  }


  // for(let i=0;i<send_chistory.length;i++){
  //   // console.log(send_chistory[i].history[send_chistory[i].history.length-1][0].xy)
  //   if(send_chistory[i].history.length>0){
  //     var predict_position=[];
      
  //       // console.log(send_chistory[i].history[0][0].bounding_box);
  //     const inputArray=new Float32Array([
  //       send_chistory[i].history[send_chistory[i].history.length-1][0].xy[0], 
  //       send_chistory[i].history[send_chistory[i].history.length-1][0].xy[1],
  //       send_chistory[i].history[send_chistory[i].history.length-2][0].xy[0],
  //       send_chistory[i].history[send_chistory[i].history.length-2][0].xy[1],
  //       send_chistory[i].history[send_chistory[i].history.length-1][0].bounding_box[0],
  //       send_chistory[i].history[send_chistory[i].history.length-1][0].bounding_box[1],
  //       send_chistory[i].history[send_chistory[i].history.length-1][0].bounding_box[2],
  //       send_chistory[i].history[send_chistory[i].history.length-1][0].bounding_box[3],
  //     ]);

  //     // const inputTensor = new onnx.Tensor(inputArray, 'float32', [1, 8]);

  //     // const outputMap = await session.run([inputTensor]);
  //     // const outputTensor = outputMap.values().next().value;
  //     // console.log(nyuryoku);
  //       // send_chistory[i].history[]
  //     predict_position=loadAndRunModel(inputArray);
  //     console.log(predict_position);
  //     // send_NN_chistory.push(predict_position);
  //   }
  // }
  
  // send_NN_mot_data={
  //   time : time,
  //   time_history : time_history,
  //   id : existing_id,
  //   chistory : send_NN_chistory,
  //   new_existing_id : new_existing_id,
  //   delete_id : delete_id,
  // }
  // console.log(send_NN_mot_data)
};

function onMultimodalData(message){
  //console.log(JSON.parse(message.value));
  try {
    send_multimodal_data = JSON.parse(message.value);
    //console.log(send_detected_data.time);
  }catch (e){
    console.log(e);
    //console.log("a");
  }
};

// onError function
function onError(error){
  console.log(`Kafka: [Error] `);
  console.error(error.stack);
}

// function fps_count(){
//   console.log(camera_fps)
//   camera_fps=0
// }
// setInterval(fps_count,1000)
import onnx from 'onnxjs';

async function loadAndRunModel(inputArray) {
    // ONNXモデルの読み込み
    const session = new onnx.InferenceSession({ backendHint: 'cpu' }); // CPUバックエンドを指定
    await session.loadModel('./model.onnx');

    // テスト用の入力データ（例: 8次元の入力ベクトル）
    // const input = new Float32Array([45658.62297425608, 14855.333939689044, 45830.27382221273, 14860.199731929417, 677.7513318641904, 238.36843791564038, 868.9199921282441, 713.2760068821399]);

    // 入力データのテンソル化
    const inputTensor = new onnx.Tensor(inputArray, 'float32', [1, 8]);

    console.time("Inference Time");
    // 推論実行
    const outputMap = await session.run([inputTensor]);
    console.timeEnd("Inference Time");
    const outputTensor = outputMap.values().next().value;

    // 結果の表示
    // console.log(outputTensor.data);
}
// const input = new Float32Array([45658.62297425608, 14855.333939689044, 45830.27382221273, 14860.199731929417, 677.7513318641904, 238.36843791564038, 868.9199921282441, 713.2760068821399]);
// loadAndRunModel(input);
