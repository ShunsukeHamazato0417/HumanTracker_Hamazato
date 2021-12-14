let sensor_n = 9;
let sensorCon = [0];
/*for (var i=1; i<=sensor_n; i++){
  sensorCon.push(new PIXI.Container());
}*/

var canvasW = 4320;
var canvasH = 3360;
var windowW = 1080;
var windowH = 840;

let app = new PIXI.Application({
  width: windowW,
  height: windowH,
  backgroundColor: 0xffffff,
});

let el = document.getElementById('app');
el.appendChild(app.view);



var sock = new WebSocket('ws://192.168.50.12:8081');
sock.onopen = function(){
  sock.send("send_RawData");  
}

var time;
var sensors;
var sCon = []
sock.onmessage = function(m){
  for (var i=app.stage.children.length-1; i>=0; i--){
    app.stage.removeChild(app.stage.children[i]);
  }

  console.log("recieve data from server.")
  var sensors = JSON.parse(m.data);
  time = sensors[0].time;

  for (var i=1; i<=sensor_n; i++){
    var sensorCon = new PIXI.Container();
    sensorCon.x = sensors[i].x / 80;
    sensorCon.y = sensors[i].y / 80;
    sensorCon.rotation = sensors[i].direction * Math.PI / 180; 
    app.stage.addChild(sensorCon);

    var sensor = new PIXI.Graphics()
      .beginFill(0x00ff00)
      .drawRect(-10, -10, 10, 10)
      .endFill();

    sensorCon.addChild(sensor);

    for (var j=0; j<sensors[i].data.length; j += 2){
      var data = new PIXI.Graphics()
        .beginFill(0xff0000)
        .drawEllipse(sensors[i].data[j][0] / 80, sensors[i].data[j][1] / 80, 2, 2)
        .endFill();

      sensorCon.addChild(data); 
    }
  }
  sock.send("send_RawData");
}

/*app.ticker.add(animate);
let amountTime = 0;

var sens = [];
function animate(delta){
  for (i=1; i<=sensor_n; i++){
    var sensor = new PIXI.Graphics()
      .beginFill(0x00ff00)
      .drawRect(-10, -10, 10, 10)
      .endFill();

    sensor.x = sensors[i].x / 80;
    sensor.y = sensors[i].y / 80;
    app.stage.addChild(sensor);
    sens.push(sensor);
  }
}*/

