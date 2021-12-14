const server = require('ws').Server;
const fs     = require('fs');

const wsserver = new server({port: 8081});


let connections = [wsserver];
let connections_info = [["192.168.50.12"]];

let json_SensorData = JSON.parse(fs.readFileSync('/home/endo/web/WSserver/config.json', 'utf8'))
//console.log(json_SensorData[0].num_of_sensors)

let json_RawData;
let json_Background;
let json_RemoveBgData;
let json_HumanDetectedData;
let json_NoiseFilteringData;


/* -----接続時の処理----- */
wsserver.on('connection', function(ws){
  /* 新しいクライアントの情報を登録 */
  newClient(ws, connections, connections_info);
  //console.log("connected from " + connections_info[connections.indexOf(ws)][0]);
  //console.log("id: " + String(connections.indexOf(ws)));


  /* メッセージ受信時の処理 */
  ws.on('message', function(ms){
    if (isValidJson(ms)){
      var json = JSON.parse(ms);
      // 受信データがJSON
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
      }
      //console.log(json_RawData[0].tag);
    }else{
      // 受信データが通常テキスト
      if (ms == "send_RawData"){
	ws.send(JSON.stringify(json_RawData));
      }else if (ms == "send_Background"){
	ws.send(JSON.stringify(json_Background));
      }else if (ms == "send_RemoveBgData"){
	ws.send(JSON.stringify(json_RemoveBgData));
      }else if (ms == "send_HumanDetectedData"){
	ws.send(JSON.stringify(json_HumanDetectedData));
      }else if (ms == "send_NoiseFilteringData"){
        ws.send(JSON.stringify(json_NoiseFilteringData));
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


