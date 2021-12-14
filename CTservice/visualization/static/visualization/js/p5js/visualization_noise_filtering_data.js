var data = [[0,0]];
var sensor_data = [0, 0, 0];
var time;
var sensor_n = 9;
var objlist = [0];
var hue;
var DLflg = false;
var DSflg = false;

var sock = new WebSocket('ws://192.168.50.12:8081');

sock.onmessage = function(m){
  if (objlist.length>1){
    var len = objlist.length - 1
    objlist.splice(1, len);
  }

  console.log("recieve data from server.")
  var sensor = JSON.parse(m.data);
  console.log(m.data);

  time = sensor[0].time;

  for (var i=1; i<=sensor_n; i++){
    hue = 360 * i / sensor_n; 
    objlist.push(new SensorObject(sensor[i].x, sensor[i].y, sensor[i].direction, 
                                  sensor[i].data, i, hue, DLflg, DSflg));

  }
}


/** -----------------------------------描画実装部分----------------------------------- **/

/* -----メインキャンバス-----*/
/* canvasのパラメータ */
var canvasW = 4320;
var canvasH = 3360;
var windowW = 1080;	// 横幅
var windowH = 840;	// 縦幅
var canvas_window;

/* 背景画像のパラメータ */
var bg_img, bg_W, bg_H;    	// 背景画像、横幅、縦幅
var bg_size = 1.0;	   	// 背景画像の表示倍率
var display_bg_img_Flg= true;	// 背景画像表示フラグ

/* 表示に関するパラメータ */
var expantion_rate = 1.0;		// 表示倍率
var max_expantion_rate = 4.0;
var display_x = 0;
var display_y = 0;
var displayW  = canvasW;
var displayH  = canvasH;

var canvas = function(p) {

  /* 事前処理 */
  p.preload = function(){
    // 背景画像読み込み
    bg_img = p.loadImage('../../../media/calibration/CT_segments.png');
    bg_W = 1439;	// 背景画像の横幅
    bg_H = 525;		// 背景画像の縦幅

    // キャンバスオブジェクト生成
    canvas_window = new CanvasObject(windowW, windowH);
  }


　/* 初期処理 */
  p.setup = function(){
    // キャンバス生成 
    canvas_window.setup(p);    

    // カラーモードをHSBに変更
    p.colorMode(p.HSB, 360, 255, 255, 255);
  }


  /* 描画 */
  p.draw = function(){

    // キャンバスの背景、枠線
    p.background(255);
    if (display_bg_img_Flg){
      p.tint(255, 127);
      p.image(bg_img, 
              (1200-display_x)*expantion_rate/max_expantion_rate, 
              ( -80-display_y)*expantion_rate/max_expantion_rate,
              bg_W*bg_size*expantion_rate, bg_H*bg_size*expantion_rate);
    }
    p.stroke(0);
    p.noFill();
    p.rect(0,0, windowW, windowH);

    // x、y軸の中心線
    p.stroke(100);
    p.line(0, windowH/2, windowW, windowH/2);
    p.stroke(100);
    p.line(windowW/2, 0, windowW/2, windowH);

    // センサオブジェクトの描画
    for (var i=1; i<objlist.length; i++){
      objlist[i].draw(p);
    }
 
    // マウスの位置を左下に表示
    p.noStroke();
    p.fill(0);
    p.text("x: " + p.str(display_x+p.mouseX*max_expantion_rate/expantion_rate) + 
         ", y: " + p.str(display_y+p.mouseY*max_expantion_rate/expantion_rate), 10, windowH - 10);
    p.text("x: " + p.str(display_x) + ", y: " + p.str(display_y), 10, windowH - 40);

    p.text("time: " + time, windowW - 200, windowH - 30);

    // 表示倍率を右下に表示
    p.noStroke();
    p.fill(0);
    p.text("x" + p.str(Math.pow(expantion_rate, 2)), windowW - 40, windowH - 10);

    sock.send("send_NoiseFilteringData");
  }


  p.doubleClicked = function(){
    if (p.mouseX <= windowW && 0 <= p.mouseX &&
        p.mouseY <= windowH && 0 <= p.mouseY ){
      if (expantion_rate<max_expantion_rate){
        if (display_x + displayW / 2 < (display_x + p.mouseX * max_expantion_rate / expantion_rate)){
          display_x = display_x + displayW / 2;
        }

        if (display_y + displayH / 2 < (display_y + p.mouseY * max_expantion_rate / expantion_rate)){
          display_y = display_y + displayH / 2;;
        }
        expantion_rate = expantion_rate * 2;
        displayW = displayW / 2;
        displayH = displayH / 2;
      }else{
        display_x = 0;
        display_y = 0;
        displayW  = canvasW;
        displayH  = canvasH;
        expantion_rate = 1.0;
      }
    }
  }
  
}



/* -----インフォ欄-----*/
/* インフォ欄のパラメータ */
var infoW = 270;	// インフォ欄の横幅
var infoH = 840;	// インフォ欄の縦幅
var blockH = 80;

/* DOMオブジェクト */
var display_Data = [];　// 0:センサ〜データ間の線の表示/非表示 1~9:各センサのデータの表示/非表示  
var display_bg_img;	// 背景画像の表示/非表示
var display_sensor;

var info = function(p){

  /* 初期処理 */
  p.setup = function(){
    // インフォ欄生成
    p.createCanvas(infoW, infoH);

    // カラーモードをHSBに変更
    p.colorMode(p.HSB, 360, 255, 255, 255);
    
    // DOMオブジェクトの生成
    display_bg_img = p.createCheckbox('背景画像を表示', true);	// 背景画像の表示/非表示
    display_sensor = p.createCheckbox('センサを表示', false); 
    display_Data.push(p.createCheckbox('ラインを表示', false)); // センサ〜データ間の線の表示/非表示
    data_update = p.createButton('更新');			// データの更新ボタン
    data_save = p.createButton('保存');				// データの保存ボタン
    for (var i=1; i<=sensor_n; i++){
      var check = p.createCheckbox('データを表示', true);
      // 各センサのデータ表示/非表示
      display_Data.push(check);
    }
  }


  /* 描画 */
  p.draw = function(){
    // 背景更新
    p.background(200);

    // センサ〜データ間の線の表示/非表示のチェックボックス
    display_Data[0].position(windowW+15, 120);
    display_Data[0].changed(p.displayDataLine);    

    // 背景画像の表示/非表示のチェックボックス
    display_bg_img.position(windowW+15, 140);
    display_bg_img.changed(p.displayBgImage);

    display_sensor.position(windowW+15, 160);
    display_sensor.changed(p.displaySensor);

    // 各センサの情報表示
    for (var i=1; i<=sensor_n; i++){
      var block_init = 120 + blockH * (i - 1);	// ブロックの上辺の座標

　　  // センサ名表示
      p.stroke(0);
      var hue_tmp = 360 * i / sensor_n;;
      p.fill(hue_tmp, 200, 200);
      p.rect(10, block_init + 5, 15, 15);
      p.textSize(15);
      p.text("sensor-" + p.str(i), 30, block_init + 16);

      // センサデータの表示/非表示のチェックボックス
      /*display_Data[i].position(windowW+120, 115+block_init);
      display_Data[i].changed(p.displayData);

      // センサデータの表示
      p.noStroke();
      p.fill(0);
      p.textSize(12);
      p.text("sensor_x :" + p.str(objlist[i].sensor_x), 30, block_init + 35);
      p.text("sensor_y :" + p.str(objlist[i].sensor_y), 30, block_init + 55);
      p.text("direction :" + p.str(Math.round(objlist[i].sensor_d*10)/10), 30, block_init + 75);
      */
    }
  }


  /* センサ〜データ間の線の表示/非表示 */
  p.displayDataLine = function(){
    if(display_Data[0].checked()){
      DLflg = true;
    }else{
      DLflg = false;
    }
  }


  /* センサのデータの表示/非表示 */
  p.displayData = function(){
    for (var i=1; i<=sensor_n; i++){
      if(display_Data[i].checked()){
        objlist[i].displayFlg = true;
      }else{
        objlist[i].displayFlg = false;
      }
    }
  }


  /* 背景画像の表示/非表示 */
  p.displayBgImage = function(){
    if(this.checked()){
      display_bg_img_Flg = true;
    }else{
      display_bg_img_Flg = false;
    }
  }


  p.displaySensor = function(){
    if(this.checked()){
      DSflg = true;
    }else{
      DSflg = false;
    }
  }

}


/* -----htmlとの受け渡し-----*/
new p5(canvas, "canvas");
new p5(info, "info");



/** -----------------------------------オブジェクトクラス----------------------------------- **/
/* スクロール */
class CanvasObject {

  constructor(windowW, windowH){
    this.width = windowW;
    this.height = windowH;
    this.fps = 10;

    this.pressedX = 0;
    this.pressedY = 0;

    this.translateFlg = false;
  }


  setup(p){
    p.createCanvas(windowW, windowH);
    p.frameRate(this.fps);
  }

}

/* センサ */
class SensorObject {
 
  /* 各パラメータ設定 */
  constructor(x, y, d, data, sensor_id, hue, DLflg, DSflg){
    // センサのパラメータ
    this.sensor_id = sensor_id;		// センサID
    this.sensor_x = x/20;		// センサのx座標
    this.sensor_y = y/20;		// センサのy座標
    this.sensor_d = d;			// センサの角度
    this.data = data;			// センサのデータ（配列）

    this.displayFlg = true;		// 表示のフラグ
    this.displaySensorFlg = DSflg	// センサ表示フラグ
    this.displayLineFlg = DLflg;	// センサ〜データ間の表示のフラグ

    // 表示パラメータ
    this.hue = hue;			// 表示の色合い（0~360）
    this.sensor_size = 18;		// センサのサイズ
    this.data_size = 3;			// データのサイズ
    this.direction_size = 4;		// 角度を表示するボックスのサイズ
    this.direction_hit_box_size = 8;	// 角度を表示するボックスの判定サイズ
    this.data_reduce_rate = 1/80;	// 表示の倍率
  }


  /* 描画 */
  draw(p){
    // 原点をセンサの位置に変更
    p.push();
    p.translate((this.sensor_x-display_x)*expantion_rate/max_expantion_rate,
                (this.sensor_y-display_y)*expantion_rate/max_expantion_rate);
  
    // 回転
    p.rotate(this.sensor_d * p.PI / 180);
  
    // データの表示 
    if (this.displayFlg){
      for (var i=0; i<this.data.length; i++){
        if (this.displayLineFlg){
        p.stroke(this.hue, 200, 200, 60);
        p.line(0, 0, this.data[i][0]*this.data_reduce_rate*expantion_rate,
                     this.data[i][1]*this.data_reduce_rate*expantion_rate);
        }   

	// データの表示
        p.noStroke();
        p.fill(this.hue, 200, 200);
        p.ellipse(this.data[i][0]*this.data_reduce_rate*expantion_rate, 
                  this.data[i][1]*this.data_reduce_rate*expantion_rate,
                  this.data_size*Math.sqrt(expantion_rate), 
                  this.data_size*Math.sqrt(expantion_rate));
      }
    }

    if (this.displaySensorFlg){
      // 角度を表示するボックスを表示
      p.stroke(this.hue, 200, 200);
      if (this.rotateFlg){
        p.fill(this.hue, 200, 200);
      }else{
        p.fill(255);
      }
      p.rect(-(this.direction_size/2), -(this.direction_size/2), 150, this.direction_size);

      // センサの表示
      p.stroke(this.hue, 200, 200);
      if (this.draggedFlg){
        p.fill(this.hue, 200, 200);
      }else{
        p.fill(255);
      }
      p.rect(-(this.sensor_size/2), -(this.sensor_size/2), this.sensor_size, this.sensor_size);
    }
    p.pop();

  }


  get_hue(){
    return this.hue;
  }

}

