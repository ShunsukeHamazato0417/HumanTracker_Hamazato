'use strict'
/* ----- Using libraries ----- */
const server       = require('ws').Server;
const fs           = require('fs');
const dateformat   = require('dateformat');
const kafka        = require('kafka-node');
const os	   = require('os');

const numCPUs      = os.cpus().length;
console.log(numCPUs);


/* ----- WebSocket Server ----- */
const wss = new server({port : 8081});
let connections = [];
let raw_data_connections = [];
let remove_bg_data_connections = [];


/* ----- Read Config ----- */
const config_json = JSON.parse(fs.readFileSync('/home/endo/web/WSserver/ws_config.json', 'utf8'));

const kafka_hosts           = config_json[0].kafkaHost;
const raw_data_topics       = config_json[0].raw_data_topics;
const remove_bg_data_topics = config_json[0].remove_bg_data_topics;

const sensor_n    = config_json[1].num_of_sensors;
const sensor_info = Array(sensor_n + 1);
const fps         = config_json[1].fps;

for (var i=1; i<=sensor_n; i++){
  sensor_info[i] = { "name"      : config_json[i+1].name,
		     "ip"        : config_json[i+1].ip,
		     "sensor_ip" : config_json[i+1].sensor_ip,
		     "x"         : config_json[i+1].x,
		     "y"         : config_json[i+1].y,
		     "direction" : config_json[i+1].direction }
}


/* -----Sending Data Format ----- */
let sending_raw_data       = Array(sensor_n + 1);
let sending_remove_bg_data = Array(sensor_n + 1);

sending_raw_data[0] = {"tag": "raw_data"};
sending_remove_bg_data[0] = {"tag": "remove_bg_data"};


/* ----- Kafka Consumer ----- */
const ConsumerGroup = kafka.ConsumerGroup;

//raw_data
const raw_data_consumerOptions = {
	  kafkaHost: kafka_hosts,
	  groupId : 'raw_data',
	  autoCommit : false,
	  protocol : ['roundrobin'],
          fromOffset : 'latest',
	  encoding : 'utf8', 
          commitOffsetsOnFirstJoin : true,
          outOfRangeOffset: 'latest'
};

const raw_data_consumer_group = new ConsumerGroup(Object.assign({ id : 'wsserver-raw_data'}, raw_data_consumerOptions), 
					          raw_data_topics);
raw_data_consumer_group.on('message', onMessage_kafka);
raw_data_consumer_group.on('error', onError_kafka);
raw_data_consumer_group.on('connect', function(){
  console.log('raw_data: connected!');
});

//remove_bg_data
const remove_bg_data_consumerOptions = {
	  kafkaHost: kafka_hosts,
	  groupId : 'remove_bg_data',
	  autoCommit : false,
	  protocol : ['roundrobin'],
          fromOffset : 'latest',
	  encoding : 'utf8', 
          commitOffsetsOnFirstJoin : true,
          outOfRangeOffset: 'latest'
};

const remove_bg_data_consumer_group = new ConsumerGroup(Object.assign({ id : 'wsserver-remove_bg_data'}, remove_bg_data_consumerOptions), 
					                remove_bg_data_topics);
remove_bg_data_consumer_group.on('message', onMessage_kafka);
remove_bg_data_consumer_group.on('error', onError_kafka);
remove_bg_data_consumer_group.on('connect', function(){
  console.log('remove_bg_data: connected!');
});




/* ----- WebScoket Functions ----- */
wss.on('connection', function(ws){
  connections.push(ws);
  console.log(connections.length);

  ws.on('message', function(msg){
    var t = JSON.parse(msg);
    if (t.ty == 'raw_data'){
      raw_data_connections.push(ws);
      console.log('raw_data: ' + raw_data_connections.length);
    } else if (t.ty == 'remove_bg_data'){
      remove_bg_data_connections.push(ws);
      console.log('remove_bg_data: ' + remove_bg_data_connections.length);
    }
  });

  ws.on('close', function(){
    connections = connections.filter(function (conn, i) {
      return (conn === ws) ? false : true;
    });
    raw_data_connections = raw_data_connections.filter(function (conn, i) {
      return (conn === ws) ? false : true;
    });
    remove_bg_data_connections = remove_bg_data_connections.filter(function (conn, i) {
      return (conn === ws) ? false : true;
    });
    console.log(connections.length);
  });
});


function broadcast(ty, message){
  var dest_connections;
  if (ty == 'raw_data'){
    dest_connections = raw_data_connections; 
  } else if (ty == 'remove_bg_data'){
    dest_connections = remove_bg_data_connections;
  }

  dest_connections.forEach(function (con, i){
    con.send(JSON.stringify(message));
    console.log(con.bufferedAmount);
  });
  //console.log('msg: %s', JSON.stringify(message));
};

setInterval(broadcast, 1000/fps, 'raw_data', sending_raw_data);
setInterval(broadcast, 1000/fps, 'remove_bg_data', sending_remove_bg_data);


/* ----- Kafka Functions ----- */
function onMessage_kafka (message) {
  var now = new Date();
  var json = JSON.parse(message.value);

  if (json.tag == "raw_data"){
    sending_raw_data[json.id] = {
      "time"      : json.time,
      "id"        : json.id,
      "x"         : sensor_info[json.id].x,
      "y"         : sensor_info[json.id].y,
      "direction" : sensor_info[json.id].direction,
      "data"      : json.data
    };
    /*var rec_time = Date.parse(sending_raw_data[json.id].time);
    var lag = now.getTime() - rec_time;
    console.log('id: %d, lag: %d s',
      json.id, 
      lag/1000
    );*/
  } else if (json.tag == "remove_bg_data"){
    sending_remove_bg_data[json.id] = {
      "time"      : json.time,
      "id"        : json.id,
      "x"         : sensor_info[json.id].x,
      "y"         : sensor_info[json.id].y,
      "direction" : sensor_info[json.id].direction,
      "data"      : json.data
    };
    /*var rec_time = Date.parse(json.time);
    var lag = now.getTime() - rec_time;
    console.log('id: %d, lag: %d s',
      json.id, 
      lag/1000
    );*/
  }

  //console.log(sending_raw_data);
}


function onError_kafka (error) {
  console.error(error);
  console.error(error.stack);
}
