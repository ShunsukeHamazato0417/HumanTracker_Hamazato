'use strict'

/**************************************
* Library
**************************************/

// Other's libraries
//const server       = require('ws').Server;
import pkg from 'ws';
  const {Server} = pkg;
import {readFileSync} from 'fs';
import { ConsumerGroup, Consumer, KafkaClient } from 'kafka-node';

// My libraries
import {client}      from './mylib/client/client.mjs';
import {sensor}      from './mylib/tool/sensor.mjs';
import {sensor_data} from './mylib/tool/sensor_data.mjs';
import {cluster}     from './mylib/tool/cluster.mjs';
import {consumer}    from './mylib/kafka/consumer.mjs'


/**************************************
* Main
**************************************/

/*** Read config ***/
const config = JSON.parse(readFileSync('/home/endo/web/WebSocketServer/conf/config.json', 'utf8'));
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
// kafka config
var kafka_servers = "";
for (const s of config.kafka.bootstrap_servers){
  kafka_servers = kafka_servers + s + ',';
}
const topics = config.kafka.topics;


/*** websocket server ***/ 
var connections = [];

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

function broadcast(types){
  var msg = "";
  if (types[0]=="all"){
    connections.forEach(function (con, i){
      eval("msg = send_"+con._datatype+";")
      //console.log(msg);
      con._ws.send(JSON.stringify(msg));
    });
  } else {
    connections.forEach(function (con, i){
      if (con._datatype in types){
        eval("msg = send_"+con._datatype+";")
        con._ws.send(JSON.stringify(msg));
      }
    });
  }
};

var send_datatype = ["all"];
setInterval(broadcast, 1000/fps, send_datatype);


/*** kafka connection ***/
// raw_data
const raw_data_consumer = 
  new consumer(kafka_servers, "raw_data", topics.raw_data, "wss-raw_data")._consumer();
  raw_data_consumer.on('connect', function(){ console.log(`Kafka: Connected raw_data topics.`); });
  raw_data_consumer.on('error', onError);
  raw_data_consumer.on('message', onSensorData);
// remove_bg_data
const remove_bg_data_consumer = 
  new consumer(kafka_servers, "remove_bg_data", topics.remove_bg_data, "wss-remove_bg_data")._consumer();
  //new consumer(kafka_servers, "remove_bg_data", topics.aggregated_remove_bg_data, "wss-remove_bg_data")._consumer();
  remove_bg_data_consumer.on('connect', function(){ console.log(`Kafka: Connected remove_bg_data topics.`); });
  remove_bg_data_consumer.on('error', onError);
  remove_bg_data_consumer.on('message', onSensorData);
  //remove_bg_data_consumer.on('message', onAggregatedSensorData);
// integrated_remove_bg_data
const integrated_remove_bg_data_consumer = 
  new consumer(kafka_servers, "integrated_remove_bg_data", topics.integrated_remove_bg_data, "wss-integrated_remove_bg_data")._consumer();
  integrated_remove_bg_data_consumer.on('connect', function(){ console.log(`Kafka: Connected integrated_remove_bg_data topics.`); });
  integrated_remove_bg_data_consumer.on('error', onError);
  integrated_remove_bg_data_consumer.on('message', onSensorData);
// dbscan_cluster_data
const dbscan_cluster_data_consumer = 
  new consumer(kafka_servers, "cluster_data", topics.dbscan_cluster_data, "cluster_data")._consumer();
  dbscan_cluster_data_consumer.on('connect', function(){ console.log(`Kafka: Connected dbscan_cluster_data topics.`); });
  dbscan_cluster_data_consumer.on('error', onError);
  dbscan_cluster_data_consumer.on('message', onClusterData);
// detected_data
const detected_data_consumer = 
  new consumer(kafka_servers, "detected_data", topics.detected_data, "detected_data")._consumer();
  detected_data_consumer.on('connect', function(){ console.log(`Kafka: Connected detected_data topics.`); });
  detected_data_consumer.on('error', onError);
  detected_data_consumer.on('message', onDetectedData);

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
  //console.log(code);
  eval(code);
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