const server       = require('ws').Server;
const fs           = require('fs');
const dateformat   = require('dateformat');
const es           = require('elasticsearch');

const wsserver = new server({port: 8081});
const esclient = new es.Client({
  host: '192.168.50.21:9200'
});


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
      "id"   : i,
      "data" : []
    }
}
for (var i=1; i<=sensor_n; i++){
  json_sensor_Background[i] =
    {
      "id"   : i,
      "data" : []
    }
}
for (var i=1; i<=sensor_n; i++){
  json_sensor_RemoveBgData[i] =
    {
      "id"   : i,
      "data" : []
    }
}
for (var i=1; i<=sensor_n; i++){
  json_sensor_NoiseFilteringData[i] =
    {
      "id"   : i,
      "data" : []
    }
}

let json_send_RawData            = Array(sensor_n + 1);
let json_send_Background         = Array(sensor_n + 1);
let json_send_RemoveBgData       = Array(sensor_n + 1);
let json_send_NoiseFilteringData = Array(sensor_n + 1);

let time_RemoveBgData;
let time_stamp = 0;

let changes = Array(sensor_n + 1);
for (var i=0; i<=sensor_n; i++){
  changes[i] = false;
}
let json_list = []
const bulkIndex = function bulkIndex(index, type, data){
  let bulkBody = [];

  data.forEach(item => {
    bulkBody.push({
      index: {
        _index: index,
        _id: item.id
      }
    });

    bulkBody.push(item);
  });

  console.log(bulkBody);
  esclient.bulk({body: bulkBody})
  .then(response => {
    console.log('here');
    let errorCount = 0;
    response.items.forEach(item => {
      if (item.index && item.index.error) {
        console.log(++errorCount, item.index.error);
      }
    });
    var a = data.length - errorCount;
    console.log(
      'Successfully indexed ' + a + ' out of ' + data.length + ' items'
    );
  })
  .catch(console.err);
};

/*esclient.ping({
  requestTimeout: 2000
}, function (error){
     if(error){
       console.log("error");
     } else {
       console.log("all ok")
     }
   }
);*/


/* -----接続時の処理----- */
wsserver.on('connection', function(ws){
  /* 新しいクライアントの情報を登録 */
  newClient(ws, connections, connections_info);
  console.log("connected from " + connections_info[connections.indexOf(ws)][0]);
  console.log("id: " + String(connections.indexOf(ws)));


  /* メッセージ受信時の処理 */
  ws.on('message', function(ms){
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
        }else if (json.tag == "background"){
          json_sensor_Background[json.id] = json;
        }else if (json.tag == "remove_bg_data"){
          changes[json.id] = true;
          json_sensor_RemoveBgData[json.id] = json;
          if (_changes()){
            var index_str = 'remove_bg_data-' + get_date();
            var type_str = 'remove_bg_data'; 
            console.log("import " + index_str + " to ES.");
            var json_buffer = [] 
            for (var i=1; i<=sensor_n; i++){
              json_buffer.push(
                {
                  "id"        : json_sensor_RemoveBgData[i].id,
                  "x"         : json_SensorData[i].x,
                  "y"         : json_SensorData[i].y,
                  "direction" : json_SensorData[i].direction,
                  "data"      : json_sensor_RemoveBgData[i].data
                });
            }
            var json_send =
            {
              "time": get_time(),
              "time_stamp" : time_stamp,
              "tag" : "remove_bg_data",
              "sensors": json_buffer,
            };
            time_stamp = time_stamp + 1;
            console.log("========== " + time_stamp + " ==========");
            console.log(json_send.time);
            json_list.push(json_send);
            bulkIndex(index_str, type_str, json_list);
            json_list.pop();

            for (var i=1; i<=sensor_n; i++){
              changes[json.id] = false;
            }
          }
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


function get_date(){
  var dt = new Date();
  var date = dateformat(dt, "yyyy.mm.dd");
  return date;
}

function _changes(){
  var r = true;
  for (var i=1; i<=sensor_n; i++){
    if (changes[i]==false){
      r = false;
      break;
    }
  }

  return r;
}
