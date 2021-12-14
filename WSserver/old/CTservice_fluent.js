const server       = require('ws').Server;
const fs           = require('fs');
const dateformat   = require('dateformat');

const wsserver = new server({port: 8081});


let connections = [wsserver];
let connections_info = [["192.168.50.12"]];

let json_SensorData = JSON.parse(fs.readFileSync('/home/endo/web/WSserver/config.json', 'utf8'))
let sensor_n = json_SensorData[0].num_of_sensors;

let json_RawData;
let json_Background;
let json_RemoveBgData;
let json_HumanDetectedData;
let json_NoiseFilteringData;
let json_ClusteringData;

let json_sensor_RawData            = Array(sensor_n + 1);
let json_sensor_Background         = Array(sensor_n + 1);
let json_sensor_RemoveBgData       = Array(sensor_n + 1);
let json_sensor_NoiseFilteringData = Array(sensor_n + 1);

for (var i=1; i<=sensor_n; i++){
  json_sensor_RawData[i] = 
    {
      "time" : "time",
      "id"   : i,
      "data" : []
    }
}
for (var i=1; i<=sensor_n; i++){
  json_sensor_Background[i] =
    {
      "time" : "time",
      "id"   : i,
      "data" : []
    }
}
for (var i=1; i<=sensor_n; i++){
  json_sensor_RemoveBgData[i] =
    {
      "time" : "time",
      "id"   : i,
      "data" : []
    }
}
for (var i=1; i<=sensor_n; i++){
  json_sensor_NoiseFilteringData[i] =
    {
      "time" : "time",
      "id"   : i,
      "data" : []
    }
}

let json_send_RawData            = Array(sensor_n + 1);
let json_send_Background         = Array(sensor_n + 1);
let json_send_RemoveBgData       = Array(sensor_n + 1);
let json_send_NoiseFilteringData = Array(sensor_n + 1);

let time_RemoveBgData;

/* -----接続時の処理----- */
wsserver.on('connection', function(ws){
  /* 新しいクライアントの情報を登録 */
  newClient(ws, connections, connections_info);
  console.log("connected from " + connections_info[connections.indexOf(ws)][0]);
  console.log("id: " + String(connections.indexOf(ws)));


  /* メッセージ受信時の処理 */
  ws.on('message', function(ms){
    console.log(ms);
    if (isValidJson(ms)){
      var json = JSON.parse(ms);
      // 受信データがJSON
      if (Array.isArray(json)){
        if (json[0].tag == "raw_data"){
          json_RawData = json;
        }else if (json[0].tag == "background"){
	  json_Background = json;
        }else if (json[0].tag == "remove_bg_data"){
	  json_RemoveBgData = json;
        }else if (json[0].tag == "human_detected_data"){
          json_HumanDetectedData = json;
        }else if (json[0].tag == "noise_filtering_data"){
          json_NoiseFilteringData = json;
        }else if (json[0].tag == "clustering_data"){
          json_ClusteringData = json;
        }
      }else{
        if (json.tag == "raw_data"){
          json_sensor_RawData[json.id] = json;
          //console.log(json_sensor_RawData[json.id]);
        }else if (json.tag == "background"){
          json_sensor_Background[json.id] = json;
          //console.log(json_sensor_Background[json.id]);
        }else if (json.tag == "remove_bg_data"){
          json_sensor_RemoveBgData[json.id] = json;
          //console.log(json_sensor_RemoveBgData[json.id]);
        }else if (json.tag == "noise_filtering_data"){
          json_sensor_NoiseFilteringData[json.id] = json;
        }
      }
    }else{
      // 受信データが通常テキスト
      if (ms == "send_RawData"){
        json_send_RawData[0] =
          {
	    "time": "time",
            "tag" : "raw_data"
          };
        for (var i=1; i<=sensor_n; i++){
          json_send_RawData[i] = 
            {
              "time"      : json_sensor_RawData[i].time,
	      "id"        : json_sensor_RawData[i].id,
              "x"         : json_SensorData[i].x,
              "y"         : json_SensorData[i].y,
              "direction" : json_SensorData[i].direction,
              "data"      : json_sensor_RawData[i].data
            };
        }
        ws.send(JSON.stringify(json_send_RawData));
      }else if (ms == "send_Background"){
        json_send_Background[0] = 
          {
            "time": "time",
            "tag" : "background"
          };
        for (var i=1; i<=sensor_n; i++){
          json_send_Background[i] =
            {
              "id"        : json_sensor_Background[i].id,
              "x"         : json_SensorData[i].x,
              "y"         : json_SensorData[i].y,
              "direction" : json_SensorData[i].direction,
              "data"      : json_sensor_Background[i].data
            };
        }
        ws.send(JSON.stringify(json_send_Background));
      }else if (ms == "send_RemoveBgData"){
	json_send_RemoveBgData[0] = 
          {
            "time": get_time(),
            "tag" : "remove_bg_data"
          };
        for (var i=1; i<=sensor_n; i++){
          json_send_RemoveBgData[i] =
            {
              "time"      : json_sensor_RemoveBgData[i].time,
              "id"        : json_sensor_RemoveBgData[i].id,
              "x"         : json_SensorData[i].x,
              "y"         : json_SensorData[i].y,
              "direction" : json_SensorData[i].direction,
              "data"      : json_sensor_RemoveBgData[i].data
            };
        }
        ws.send(JSON.stringify(json_send_RemoveBgData));
      }else if (ms == "send_NoiseFilteringData"){
        json_send_NoiseFilteringData[0] =
          { 
            "time": "time",
            "tag" : "noise_filtering_data"
          };
        for (var i=1; i<=sensor_n; i++){
          json_send_NoiseFilteringData[i] =
            { 
              "id"        : json_sensor_NoiseFilteringData[i].id,
              "x"         : json_SensorData[i].x,
              "y"         : json_SensorData[i].y,
              "direction" : json_SensorData[i].direction,
              "data"      : json_sensor_NoiseFilteringData[i].data
            };
        }
        ws.send(JSON.stringify(json_send_NoiseFilteringData)); 
      }else if (ms == "send_HumanDetectedData"){
        ws.send(JSON.stringify(json_HumanDetectedData));
      }else if (ms == "send_ClusteringData"){
        ws.send(JSON.stringify(json_ClusteringData))
      }

      /*if (ms == "send_RawData"){
	ws.send(JSON.stringify(json_RawData));
      }else if (ms == "send_Background"){
	ws.send(JSON.stringify(json_Background));
      }else if (ms == "send_RemoveBgData"){
	ws.send(JSON.stringify(json_RemoveBgData));
      }else if (ms == "send_HumanDetectedData"){
	ws.send(JSON.stringify(json_HumanDetectedData));
      }else if (ms == "send_NoiseFilteringData"){
        ws.send(JSON.stringify(json_NoiseFilteringData));
      }*/
    }
  });

  
  /*  */
  ws.on('close', function(){
    // console.log('disconneted from ' + connections_info[connections.indexOf(ws)][0]);
  });
});


function isValidJson(ms){
  try{
    JSON.parse(ms);
  }catch{
    return false;
  }
  return true;
}


function newClient(ws, connections, connections_info){
  var created = false;
  for (var i=1; i<connections.length; i++){
    if (connections[i].readyState == 3){
      connections[i] = ws;
      connections_info[i][0] = ws._socket.remoteAddress;
      created = true;
      break;
    }
  }

  if (!created){
    connections.push(ws);
    connections_info.push([ws._socket.remoteAddress]);
  }
}


function get_time(){
  var dt = new Date();
  var date = dateformat(dt, "yyyy/mm/dd HH:MM:ss.l")
  return date
}
