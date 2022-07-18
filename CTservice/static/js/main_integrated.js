'use strict';
if (!window.Worker){
  console.log("You cannot use WebWorker in this browser.");
  console.log("Please use browser that supported WebWorker.")
  //exit 
}


import * as PIXI from 'pixi.js';


let sensor_n = 9;

/* ----- 前処理 ----- */
var ty = getParam('ty')
if (ty==null) {ty='raw_data';}

function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/*########################

##### 描画範囲の設定 ##### 
########################*/
/* ----- windowの大きさ取得-----*/
let window_w = window.innerWidth;
let window_h = window.innerHeight-60; 


/* ----- 描画領域の定義 -----*/
let app_aspect_ratio = [4, 3];     // 可視化canvas(app)の縦横比
let app_info_ratio   = [3, 1];     // appと情報canvas(info)の幅比

// app, infoの大きさ定義
let app_w, app_h, info_w, info_h;  
app_w  = window_w * (app_info_ratio[0]/(app_info_ratio[0]+app_info_ratio[1]));
info_h = window_h;
app_h  = window_h;
if (app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]) > app_h){
  app_w = app_h * (app_aspect_ratio[0]/app_aspect_ratio[1]);
} else {
  app_h = app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]);
}
info_w = window_w - app_w;
if (info_w<540){info_w = 540;}

// app, infoの定義
let app = new PIXI.Application({
  width  : app_w,
  height : app_h,
  backgroundColor: 0xffffff
});
let info = new PIXI.Application({
  width  : info_w,
  height : info_h,
  backgroundColor : 0xcccccc
});
let container = document.getElementsByClassName('canvas');
let app_canvas   = container[0];
let info_canvas  = container[1];
app_canvas.appendChild(app.view);
info_canvas.appendChild(info.view);

// レイヤー定義
//app.stage.addChild(new )

// appの背景描画
let background = new PIXI.Container();
let bg = new PIXI.Graphics()
  .beginFill(0x000000)
  .drawRect(0, 0, app_w, app_h)
  .endFill()
app.stage.addChild(bg);
let texture = PIXI.Texture.from('../../../media/floormap_20210921.png');
let bg_img = new PIXI.Sprite(texture);
bg_img.alpha = 0.5
app.stage.addChild(bg_img);
let contour = new PIXI.Graphics()
  .lineStyle(2, 0x444444, 1)
  .moveTo(0, 0)
  .lineTo(app_w, 0).lineTo(app_w, app_h)
  .lineTo(0, app_h).lineTo(0, 0);
if (app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]) > app_h){
  app_w = app_h * (app_aspect_ratio[0]/app_aspect_ratio[1]);
} else {
  app_h = app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]);
}
background.addChild(contour);
let grid = new PIXI.Graphics()
  .lineStyle(1, 0x444444, 1)
  .moveTo(0, app_h/2).lineTo(app_w, app_h/2)
  .moveTo(app_w/2, 0).lineTo(app_w/2, app_h);
background.addChild(grid);
app.stage.addChild(background);



/*########################
######## 描画処理 ######## 
########################*/
// Worker定義 
const worker = new Worker(new URL('./worker_integrated.js', import.meta.url));
worker.postMessage({
	ty: ty
})

// 検証用変数
let pre_get_time = new Date();
let now, time, start, drawing, wait, lag;
let fps_count = 0;
var colors = [0xaaff00, 0xaa00ff, 0x00ffff,
	      0x00ff00, 0xffaa00, 0xff0000,
              0x0000ff, 0x00ffaa, 0xff00ff];
var basic_sensor_color = 0x00ff00;
var basic_data_color   = 0xffffff;

let lag_display = new PIXI.Text('Lag: --s',
  {fontFamily : 'Arial',
   fontSize : 15,
   fill : 0x000000,
   align : 'center'});
lag_display.x = 20;
lag_display.y = 70;
info.stage.addChild(lag_display);
let fps_display = new PIXI.Text('FPS: --fps',
  {fontFamily : 'Arial',
   fontSize : 15,
   fill : 0x000000,
   align : 'center'});
fps_display.x = 180;
fps_display.y = 70;
info.stage.addChild(fps_display);

let sensor_info = [sensor_n+1];
let sensor_color_box = [sensor_n+1];
let sensor_name = [sensor_n+1];
let sensor_lag = [sensor_n+1];

var lags = [sensor_n+1];
for (var i=0; i<=sensor_n; i++) { lags[i] = 0; }

var sensor_info_top = 100;
var sensor_info_bot = 820;
var sensor_info_height = (sensor_info_bot-sensor_info_top)/sensor_n;
var sensor_info_column = 3;
var sensor_info_right = 20;
var sensor_info_left  = info_w - 20;
var sensor_info_width = (sensor_info_left - sensor_info_right) / sensor_info_column;
 
for (var i=1; i<=sensor_n; i++){
  sensor_info[i] = new PIXI.Container();
  sensor_color_box[i] = new PIXI.Graphics()
			.beginFill(colors[i-1])
			.drawRect(0, 0, 20, 20)
			.endFill();
  sensor_name[i] = new PIXI.Text('sensor-'+i,
			{fontFamily : 'Arial',
			 fontSize : 15,
			 fill : 0x000000,
			 algin : 'center'});
  sensor_name[i].x = 30;
  sensor_name[i].y = 0;
  sensor_lag[i] = new PIXI.Text('Lag: --s',
			{fontFamily : 'Arial',
			 fontSize : 15,
			 fill : 0x000000,
			 algin : 'center'});
  //sensor_lag[i].x = 20;
  //sensor_lag[i].y = sensor_info_top + sensor_info_height * (i-1) + 30;
  sensor_lag[i].x = 0;
  sensor_lag[i].y = 30;

 
  sensor_info[i].addChild(sensor_color_box[i]);
  sensor_info[i].addChild(sensor_name[i]);
  sensor_info[i].addChild(sensor_lag[i]);

  //info.stage.addChild(sensor_lag[i]);

  sensor_info[i].x = 20 + (((i+2)%sensor_info_column)) * sensor_info_width;
  sensor_info[i].y = sensor_info_top + sensor_info_height * (Math.ceil(i/sensor_info_column)-1);
  info.stage.addChild(sensor_info[i]);
}


// 描画時の設定
let display_ratio = 1/60;
let supposed_app_w = 1440;
let supposed_app_h = supposed_app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]);
let app_display_ratio = app_w / supposed_app_w;

//拡大縮小
let bg_scale, bg_x, bg_y;
bg_scale = 0.96 * app_display_ratio;
bg_x = 455 * app_display_ratio;
bg_y = 57 * app_display_ratio;
bg_img.x = bg_x;
bg_img.y = bg_y;
bg_img.scale.x = bg_img.scale.y = bg_scale;
let mouse_init_x, mouse_init_y, mouse_end_x, mouse_end_y, rect_w, rect_h, mx, my;
let display_min_x, display_min_y, display_max_x, display_max_y;
bg.interactive = true;
var down = false;
bg.on('pointerdown', mouse_down);
bg.on('pointermove', mouse_move);
bg.on('pointerup', mouse_up);

let mouse_rect = new PIXI.Graphics()
	.beginFill(0x0000ff)
	.drawRect(0, 0, 0, 0)
	.endFill();
app.stage.addChild(mouse_rect);

function mouse_down(){
  mouse_init_x = app.renderer.plugins.interaction.mouse.global.x;
  mouse_init_y = app.renderer.plugins.interaction.mouse.global.y;
  down = true;
}
function mouse_move(){
  if (down){
    mx = app.renderer.plugins.interaction.mouse.global.x;
    my = app.renderer.plugins.interaction.mouse.global.y;
    
    rect_w = mx-mouse_init_x;
    rect_h = my-mouse_init_y;
    if (rect_w * (app_aspect_ratio[1]/app_aspect_ratio[0]) > rect_h){
      rect_w = rect_h * (app_aspect_ratio[0]/app_aspect_ratio[1]);
    } else {
      rect_h = rect_w * (app_aspect_ratio[1]/app_aspect_ratio[0]);
    }

    mouse_rect.clear();
    mouse_rect.beginFill(0x0000ff);
    mouse_rect.drawRect(mouse_init_x, mouse_init_y, rect_w, rect_h);
    mouse_rect.endFill();
    mouse_rect.alpha = 0.5;
  }
}
function mouse_up(){
  mouse_end_x = mouse_init_x + rect_w;
  mouse_end_y = mouse_init_y + rect_h;
  
  display_min_x = Math.min(mouse_init_x, mouse_end_x);
  display_min_y = Math.min(mouse_init_y, mouse_end_y);
  display_max_x = Math.max(mouse_init_x, mouse_end_x);
  display_max_y = Math.max(mouse_init_y, mouse_end_y);

  display_w = rect_w;
  display_h = rect_h;

  bg_img.scale.x = bg_img.scale.y = bg_scale * (app_w / display_w);
  bg_img.x = (bg_x - display_min_x) * (app_w / display_w);
  bg_img.y = (bg_y - display_min_y) * (app_w / display_w);

  down = false;
  mouse_rect.clear();
}


// 描画時のフラグ
let displaying = false; 
let display_sensor = [sensor_n+1];

for (var i=0; i<=sensor_n; i++) { display_sensor[i] = true; }
for (var i=1; i<=sensor_n; i++){
  sensor_color_box[i].interactive = true;
  sensor_color_box[i].buttonMode  = true;
  sensor_color_box[i].on('pointerup', function(){
    var n = sensor_color_box.indexOf(this);
    if (display_sensor[n]){
      display_sensor[n] = false;
      this.alpha = 0.25;
    } else {
      display_sensor[n] = true;
      this.alpha = 1;
    }
  });
}


// データの受信時処理
var display_json;
worker.addEventListener('message', function(msg){
  if (!displaying){
    //display_json = msg.data;
    //console.log('recieve');
    display_sensor_data(msg.data);
  }
}, false);


// データ描画処理
var display_w = app_w;
var display_h = app_h;
display_min_x = 0;
display_min_y = 0;
display_max_x = app_w;
display_max_y = app_h;
var scaling_ratio;
var expantion_ratio;
var data   = new PIXI.Graphics();
var sensor = new PIXI.Graphics();
//data.setTransform(0, 0, expantion_ratio, expantion_ratio);
//sensor.setTransform(0, 0, expantion_ratio, expantion_ratio);
app.stage.addChild(data);
app.stage.addChild(sensor);
var data_size   = 2  / expantion_ratio;
var sensor_size = 10 / expantion_ratio;


/*var lags = [sensor_n+1];
for (var i=0; i<=sensor_n; i++) { lags[i] = 0; }*/

//worker.postMessage({request: "raw_data"});

//app.ticker.maxFPS = 20;
//app.ticker.add(() => {
function display_sensor_data(json){
  displaying = true;
  scaling_ratio = app_w / display_w;
  expantion_ratio = display_ratio * app_display_ratio * scaling_ratio;
  data.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  sensor.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  data_size   = 2  / expantion_ratio;
  sensor_size = 10 / expantion_ratio;

  sensor.clear();
  data.clear();
  
  for (var i=1; i<json.length; i++){
    for (var j=0; j<json[i].data.length; j += 1){
      if (display_sensor[i]){
        var c;
        if (display_sensor[0]){c = basic_data_color;} 
        else {c = colors[i-1];}

        data.beginFill(c);
        data.drawRect(json[i].data[j][0] - data_size/2, 
                      json[i].data[j][1] - data_size/2,
  		      data_size, data_size)
        data.endFill();
      }
    }
  }

  for (var i=1; i<json.length; i++){
    var c;
    /*if (display_sensor[0]){c = basic_sensor_color;} 
    else {c = colors[i-1];}*/
    c = colors[i-1];
    sensor.lineStyle(100, 0xffffff, 1, 1);
    sensor.beginFill(c);
    sensor.drawRect(json[i].x - sensor_size/2, 
		    json[i].y - sensor_size/2, 
         	    sensor_size, sensor_size);
    sensor.endFill();

    now = new Date();
    time = to_date(json[i].time);
    lag  = now.getTime() - time.getTime();
    lags[0] += lag;
    lags[i] += lag;
  }

  fps_count++;

  //drawing = now.getTime() - start.getTime();
  //wait = (now.getTime() - pre_get_time.getTime()) - drawing;
  //lag_display.text = 'Lag: ' + lag + 's';
  //drawing_display.text = 'Drawing: ' + drawing + 'ms';
  //wait_display.text = 'Wait: ' + wait + 'ms';

  displaying = false;
}
//});

var lag_init = 0;
var reconnect_lag = 10;

function FpsDisplay(){
  if (lag_init==0){lag_init = Math.floor(lags[0]/(fps_count*sensor_n))/1000;}
  if (Math.floor(lags[0]/(fps_count*sensor_n))/1000 > lag_init+reconnect_lag){
    worker.postMessage({ command: 'Forced reconnect'})
  }
  lag_display.text = 'Lag: ' + Math.floor(lags[0]/(fps_count*sensor_n))/1000 + 's';
  fps_display.text = 'FPS: ' + fps_count + 'fps';
 
  for (var i=1; i<lags.length; i++){
    sensor_lag[i].text = 'Lag: ' + Math.floor(lags[i]/fps_count)/1000 + 's';
    lags[i] = 0;
  }

  lags[0] = 0;
  fps_count = 0;
}
setInterval(FpsDisplay, 1000);


// 時間変換
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



/*########################
######## info処理 ######## 
########################*/

// ページ更新ボタン
let reload_text = new PIXI.Text('RELOAD',
  {fontFamily : 'Arial',
   fontSize : 15, 
   fill : 0x000000, 
   align : 'center'});
reload_text.x = 5;
reload_text.y = 5;
let reload_button = new PIXI.Graphics()
  .beginFill(0xffffff)
  .drawRect(0, 0, 70, 30)
  .endFill();
reload_button.interactive = true;
reload_button.buttonMode = true;
let reload = new PIXI.Container();
info.stage.addChild(reload);
reload.addChild(reload_button);
reload.addChild(reload_text);
reload.x = 20;
reload.y = 20;

reload_button.on('pointerup', function(){
  displaying = true;
  window.location.reload(true);
});

// 再接続ボタン
let reconnect_text = new PIXI.Text('RECONNECT',
  {fontFamily : 'Arial',
   fontSize : 15, 
   fill : 0x000000, 
   align : 'center'});
reconnect_text.x = 5;
reconnect_text.y = 5;
let reconnect_button = new PIXI.Graphics()
  .beginFill(0xffffff)
  .drawRect(0, 0, 105, 30)
  .endFill();
reconnect_button.interactive = true;
reconnect_button.buttonMode = true;
let reconnect = new PIXI.Container();
info.stage.addChild(reconnect);
reconnect.addChild(reconnect_button);
reconnect.addChild(reconnect_text);
reconnect.x = 100; 
reconnect.y = 20;

reconnect_button.on('pointerup', function(){
  worker.postMessage({ command : 'reconnect' })
});

// 拡大リセットボタン
let scale_reset_button = new PIXI.Graphics()
	.beginFill(0xffffff)
	.drawRect(0, 0, 115, 30)
	.endFill();
let scale_reset_text = new PIXI.Text('SCALE RESET',
	{fontFamily : 'Arial',
	 fontSize : 15,
	 fill : 0x000000,
	 algin : 'center'});
scale_reset_text.x = 5;
scale_reset_text.y = 5;
let scale_reset = new PIXI.Container();
info.stage.addChild(scale_reset);
scale_reset.addChild(scale_reset_button);
scale_reset.addChild(scale_reset_text);
scale_reset.x = 215;
scale_reset.y = 20;

scale_reset_button.interactive = true;
scale_reset_button.buttonMode = true;
scale_reset_button.on('pointerup', function(){
  display_min_x = display_min_y = 0;
  display_max_x = app_w; display_max_y = app_h;
  display_w = app_w;
  display_h = app_h;
  bg_img.scale.x = bg_img.scale.y = bg_scale;
  bg_img.x = bg_x;
  bg_img.y = bg_y;
});

// 色変更ボタン
sensor_info[0] = new PIXI.Container();
info.stage.addChild(sensor_info[0]);
sensor_color_box[0] = new PIXI.Graphics()
			.beginFill(0xffffff)
			.drawRect(0, 0, 63, 30)
                        .endFill();
sensor_name[0] = new PIXI.Text('COLOR',
			       {fontFamily : 'Arial',
			        fontSize : 15,
				fill : 0x000000,
				align : 'center'});
sensor_name[0].x = 5;
sensor_name[0].y = 5;

sensor_info[0].addChild(sensor_color_box[0]);
sensor_info[0].addChild(sensor_name[0]);

sensor_info[0].x = 340;
sensor_info[0].y = 20;

sensor_color_box[0].interactive = true;
sensor_color_box[0].buttonMode  = true;
sensor_color_box[0].on('pointerup', function(){
  if (display_sensor[0]){
      display_sensor[0] = false;
    } else {
      display_sensor[0] = true;
    }
});

