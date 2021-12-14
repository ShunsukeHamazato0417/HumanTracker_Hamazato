var data = [];
var sensor_data = [];
var time;
var sensor_n;

/** -----------------------------------データ読み込み----------------------------------- **/
/* -----json読み込み----- */
$.ajaxSetup({async: false});
$.getJSON("../static/calibration/json/for_calibration.json", function(sensor){
  time = sensor[0].time; 
  document.write("<p>time: " + time + "</p>");

  var len = sensor.length;
  sensor_n = len - 1;

  sensor_data.push([0,0,0]);
  data.push([0]);
  for (var i=1; i<len; i++){
    var tmp = [];
    tmp.push(sensor[i].x);
    tmp.push(sensor[i].y);
    tmp.push(sensor[i].direction);
    sensor_data.push(tmp);

    var data_len = sensor[i].data.length;
    var tmp = [];
    for (var j=0; j<data_len; j++){
      tmp.push(sensor[i].data[j]);
    }
    data.push(tmp);
  }
});
$.ajaxSetup({async: true});


/* -----yaml読み込み----- */
//var config = jsyaml.load



/** -----------------------------------描画実装部分----------------------------------- **/
var objlist = [0];	// センサオブジェクトのリスト（１〜９、０は空き）
var increase = [0];
var decrease = [0];

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

    // センサオブジェクト生成 
    var hue;
    for (var i=1; i<data.length; i++){
      hue = 360 * i / sensor_n;

      var tmp1 = [];
      var tmp2 = [];
      tmp1.push(p.createButton('+10'));
      tmp1.push(p.createButton('+1'));
      tmp2.push(tmp1);
      var tmp1 = [];
      tmp1.push(p.createButton('+10'));
      tmp1.push(p.createButton('+1'));
      tmp2.push(tmp1);
      var tmp1 = [];
      tmp1.push(p.createButton('+1'));
      tmp1.push(p.createButton('+0.1'));
      tmp2.push(tmp1);
      increase.push(tmp2);

      var tmp1 = [];
      var tmp2 = [];
      tmp1.push(p.createButton('-10'));
      tmp1.push(p.createButton('-1'));
      tmp2.push(tmp1);
      var tmp1 = [];
      tmp1.push(p.createButton('-10'));
      tmp1.push(p.createButton('-1'));
      tmp2.push(tmp1);
      var tmp1 = [];
      tmp1.push(p.createButton('-1'));
      tmp1.push(p.createButton('-0.1'));
      tmp2.push(tmp1);
      decrease.push(tmp2);

      objlist.push(new SensorObject(sensor_data[i], data[i], i, hue, increase[i], decrease[i]));
    }
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

    // 表示倍率を右下に表示
    p.noStroke();
    p.fill(0);
    p.text("x" + p.str(Math.pow(expantion_rate, 2)), windowW - 40, windowH - 10);
  }


  /* マウス押し込み時の処理 */
  p.mousePressed = function(){
    // 押されたセンサを特定（重なっているときは上のものを優先）
    for (var i=objlist.length-1; i>0; i--){
      if(objlist[i].pressed(p)){
        // 押されたセンサを上に表示
        var tmp = objlist[i];
	objlist.splice(i, 1);
        objlist.push(tmp);

	break;
      }
    }
  }


  /* マウスドラッグ時の処理 */
  p.mouseDragged = function(){
    for (var i=1; i<objlist.length; i++){
      objlist[i].drag(p);
      objlist[i].rotate(p);
    }
  }


  /* マウスを離した時の処理 */
  p.mouseReleased = function(){
    canvas_window.release();
    for (var i=1; i<objlist.length; i++){
      objlist[i].release();
    }
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
var data_update;	// 表示データの更新
var data_save;		// データの保存

var info = function(p){

  /* 初期処理 */
  p.setup = function(){
    // インフォ欄生成
    p.createCanvas(infoW, infoH);

    // カラーモードをHSBに変更
    p.colorMode(p.HSB, 360, 255, 255, 255);
    
    // DOMオブジェクトの生成
    display_bg_img = p.createCheckbox('背景画像を表示', true);	// 背景画像の表示/非表示
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

    // データの更新ボタンの表示
    data_update.position(windowW+15, 120);

    // データの保存ボタンの表示
    data_save.position(windowW+80, 120);

    // センサ〜データ間の線の表示/非表示のチェックボックス
    display_Data[0].position(windowW+15, 150);
    display_Data[0].changed(p.displayDataLine);    

    // 背景画像の表示/非表示のチェックボックス
    display_bg_img.position(windowW+15, 170);
    display_bg_img.changed(p.displayBgImage);

    // 各センサの情報表示
    for (var i=1; i<=sensor_n; i++){
      var id = objlist[i].sensor_id;
      var block_init = 120 + blockH * (id - 1);	// ブロックの上辺の座標

　　  // センサ名表示
      p.stroke(0);
      p.fill(objlist[i].hue, 200, 200);
      p.rect(10, block_init + 5, 15, 15);
      p.textSize(15);
      p.text("sensor-" + p.str(id), 30, block_init + 16);

      // センサデータの表示/非表示のチェックボックス
      display_Data[i].position(windowW+120, 115+block_init);
      display_Data[i].changed(p.displayData);

      // センサデータの表示
      p.noStroke();
      p.fill(0);
      p.textSize(12);
      p.text("sensor_x :" + p.str(objlist[i].sensor_x), 30, block_init + 35);
      p.text("sensor_y :" + p.str(objlist[i].sensor_y), 30, block_init + 55);
      p.text("direction :" + p.str(Math.round(objlist[i].sensor_d*10)/10), 30, block_init + 75);

 
      objlist[i].increase[0][0].position(windowW+135, block_init+135);
      objlist[i].increase[1][0].position(windowW+135, block_init+155);
      objlist[i].increase[2][0].position(windowW+135, block_init+175);

      objlist[i].increase[0][1].position(windowW+170, block_init+135);
      objlist[i].increase[1][1].position(windowW+170, block_init+155);
      objlist[i].increase[2][1].position(windowW+162, block_init+175);

      objlist[i].decrease[0][1].position(windowW+200, block_init+135);
      objlist[i].decrease[1][1].position(windowW+200, block_init+155);
      objlist[i].decrease[2][1].position(windowW+200, block_init+175);

      objlist[i].decrease[0][0].position(windowW+225, block_init+135);
      objlist[i].decrease[1][0].position(windowW+225, block_init+155);
      objlist[i].decrease[2][0].position(windowW+235, block_init+175);

      /*for (var j=0; j<3; j++){
        for (var k=0; k<2; k++){
          objlist[i].increase[j][k].mousePressed(function(){
            if (j==0){
              objlist[1].sensor_x += k;//9*(1-k) + 1;
            }else if (j==1){
              objlist[i].sensor_y -= 9*k + 1;
            }else if (j==2){
              objlist[i].sensor_d -= 0.9*k + 0.1;
            }
          });
          objlist[i].decrease[j][k].mousePressed(function(){
            objlist[i].decreasing(j,k);
          });
        }
      }*/
    }

    // ボタンの処理（解決策が分かり次第書き換え）
    objlist[1].increase[0][0].mousePressed(function(){ objlist[1].sensor_x += 10;})
    objlist[1].increase[0][1].mousePressed(function(){ objlist[1].sensor_x +=  1;})
    objlist[1].increase[1][0].mousePressed(function(){ objlist[1].sensor_y += 10;})
    objlist[1].increase[1][1].mousePressed(function(){ objlist[1].sensor_y +=  1;})
    objlist[1].increase[2][0].mousePressed(function(){ objlist[1].sensor_d +=  1;})
    objlist[1].increase[2][1].mousePressed(function(){ objlist[1].sensor_d +=0.1;})
    objlist[1].decrease[0][0].mousePressed(function(){ objlist[1].sensor_x -= 10;})
    objlist[1].decrease[0][1].mousePressed(function(){ objlist[1].sensor_x -=  1;})
    objlist[1].decrease[1][0].mousePressed(function(){ objlist[1].sensor_y -= 10;})
    objlist[1].decrease[1][1].mousePressed(function(){ objlist[1].sensor_y -=  1;})
    objlist[1].decrease[2][0].mousePressed(function(){ objlist[1].sensor_d -=  1;})
    objlist[1].decrease[2][1].mousePressed(function(){ objlist[1].sensor_d -=0.1;})

    objlist[2].increase[0][0].mousePressed(function(){ objlist[2].sensor_x += 10;})
    objlist[2].increase[0][1].mousePressed(function(){ objlist[2].sensor_x +=  1;})
    objlist[2].increase[1][0].mousePressed(function(){ objlist[2].sensor_y += 10;})
    objlist[2].increase[1][1].mousePressed(function(){ objlist[2].sensor_y +=  1;})
    objlist[2].increase[2][0].mousePressed(function(){ objlist[2].sensor_d +=  1;})
    objlist[2].increase[2][1].mousePressed(function(){ objlist[2].sensor_d +=0.1;})
    objlist[2].decrease[0][0].mousePressed(function(){ objlist[2].sensor_x -= 10;})
    objlist[2].decrease[0][1].mousePressed(function(){ objlist[2].sensor_x -=  1;})
    objlist[2].decrease[1][0].mousePressed(function(){ objlist[2].sensor_y -= 10;})
    objlist[2].decrease[1][1].mousePressed(function(){ objlist[2].sensor_y -=  1;})
    objlist[2].decrease[2][0].mousePressed(function(){ objlist[2].sensor_d -=  1;})
    objlist[2].decrease[2][1].mousePressed(function(){ objlist[2].sensor_d -=0.1;})

    objlist[3].increase[0][0].mousePressed(function(){ objlist[3].sensor_x += 10;})
    objlist[3].increase[0][1].mousePressed(function(){ objlist[3].sensor_x +=  1;})
    objlist[3].increase[1][0].mousePressed(function(){ objlist[3].sensor_y += 10;})
    objlist[3].increase[1][1].mousePressed(function(){ objlist[3].sensor_y +=  1;})
    objlist[3].increase[2][0].mousePressed(function(){ objlist[3].sensor_d +=  1;})
    objlist[3].increase[2][1].mousePressed(function(){ objlist[3].sensor_d +=0.1;})
    objlist[3].decrease[0][0].mousePressed(function(){ objlist[3].sensor_x -= 10;})
    objlist[3].decrease[0][1].mousePressed(function(){ objlist[3].sensor_x -=  1;})
    objlist[3].decrease[1][0].mousePressed(function(){ objlist[3].sensor_y -= 10;})
    objlist[3].decrease[1][1].mousePressed(function(){ objlist[3].sensor_y -=  1;})
    objlist[3].decrease[2][0].mousePressed(function(){ objlist[3].sensor_d -=  1;})
    objlist[3].decrease[2][1].mousePressed(function(){ objlist[3].sensor_d -=0.1;})

    objlist[4].increase[0][0].mousePressed(function(){ objlist[4].sensor_x += 10;})
    objlist[4].increase[0][1].mousePressed(function(){ objlist[4].sensor_x +=  1;})
    objlist[4].increase[1][0].mousePressed(function(){ objlist[4].sensor_y += 10;})
    objlist[4].increase[1][1].mousePressed(function(){ objlist[4].sensor_y +=  1;})
    objlist[4].increase[2][0].mousePressed(function(){ objlist[4].sensor_d +=  1;})
    objlist[4].increase[2][1].mousePressed(function(){ objlist[4].sensor_d +=0.1;})
    objlist[4].decrease[0][0].mousePressed(function(){ objlist[4].sensor_x -= 10;})
    objlist[4].decrease[0][1].mousePressed(function(){ objlist[4].sensor_x -=  1;})
    objlist[4].decrease[1][0].mousePressed(function(){ objlist[4].sensor_y -= 10;})
    objlist[4].decrease[1][1].mousePressed(function(){ objlist[4].sensor_y -=  1;})
    objlist[4].decrease[2][0].mousePressed(function(){ objlist[4].sensor_d -=  1;})
    objlist[4].decrease[2][1].mousePressed(function(){ objlist[4].sensor_d -=0.1;})

    objlist[5].increase[0][0].mousePressed(function(){ objlist[5].sensor_x += 10;})
    objlist[5].increase[0][1].mousePressed(function(){ objlist[5].sensor_x +=  1;})
    objlist[5].increase[1][0].mousePressed(function(){ objlist[5].sensor_y += 10;})
    objlist[5].increase[1][1].mousePressed(function(){ objlist[5].sensor_y +=  1;})
    objlist[5].increase[2][0].mousePressed(function(){ objlist[5].sensor_d +=  1;})
    objlist[5].increase[2][1].mousePressed(function(){ objlist[5].sensor_d +=0.1;})
    objlist[5].decrease[0][0].mousePressed(function(){ objlist[5].sensor_x -= 10;})
    objlist[5].decrease[0][1].mousePressed(function(){ objlist[5].sensor_x -=  1;})
    objlist[5].decrease[1][0].mousePressed(function(){ objlist[5].sensor_y -= 10;})
    objlist[5].decrease[1][1].mousePressed(function(){ objlist[5].sensor_y -=  1;})
    objlist[5].decrease[2][0].mousePressed(function(){ objlist[5].sensor_d -=  1;})
    objlist[5].decrease[2][1].mousePressed(function(){ objlist[5].sensor_d -=0.1;})

    objlist[6].increase[0][0].mousePressed(function(){ objlist[6].sensor_x += 10;})
    objlist[6].increase[0][1].mousePressed(function(){ objlist[6].sensor_x +=  1;})
    objlist[6].increase[1][0].mousePressed(function(){ objlist[6].sensor_y += 10;})
    objlist[6].increase[1][1].mousePressed(function(){ objlist[6].sensor_y +=  1;})
    objlist[6].increase[2][0].mousePressed(function(){ objlist[6].sensor_d +=  1;})
    objlist[6].increase[2][1].mousePressed(function(){ objlist[6].sensor_d +=0.1;})
    objlist[6].decrease[0][0].mousePressed(function(){ objlist[6].sensor_x -= 10;})
    objlist[6].decrease[0][1].mousePressed(function(){ objlist[6].sensor_x -=  1;})
    objlist[6].decrease[1][0].mousePressed(function(){ objlist[6].sensor_y -= 10;})
    objlist[6].decrease[1][1].mousePressed(function(){ objlist[6].sensor_y -=  1;})
    objlist[6].decrease[2][0].mousePressed(function(){ objlist[6].sensor_d -=  1;})
    objlist[6].decrease[2][1].mousePressed(function(){ objlist[6].sensor_d -=0.1;})

    objlist[7].increase[0][0].mousePressed(function(){ objlist[7].sensor_x += 10;})
    objlist[7].increase[0][1].mousePressed(function(){ objlist[7].sensor_x +=  1;})
    objlist[7].increase[1][0].mousePressed(function(){ objlist[7].sensor_y += 10;})
    objlist[7].increase[1][1].mousePressed(function(){ objlist[7].sensor_y +=  1;})
    objlist[7].increase[2][0].mousePressed(function(){ objlist[7].sensor_d +=  1;})
    objlist[7].increase[2][1].mousePressed(function(){ objlist[7].sensor_d +=0.1;})
    objlist[7].decrease[0][0].mousePressed(function(){ objlist[7].sensor_x -= 10;})
    objlist[7].decrease[0][1].mousePressed(function(){ objlist[7].sensor_x -=  1;})
    objlist[7].decrease[1][0].mousePressed(function(){ objlist[7].sensor_y -= 10;})
    objlist[7].decrease[1][1].mousePressed(function(){ objlist[7].sensor_y -=  1;})
    objlist[7].decrease[2][0].mousePressed(function(){ objlist[7].sensor_d -=  1;})
    objlist[7].decrease[2][1].mousePressed(function(){ objlist[7].sensor_d -=0.1;})

    objlist[8].increase[0][0].mousePressed(function(){ objlist[8].sensor_x += 10;})
    objlist[8].increase[0][1].mousePressed(function(){ objlist[8].sensor_x +=  1;})
    objlist[8].increase[1][0].mousePressed(function(){ objlist[8].sensor_y += 10;})
    objlist[8].increase[1][1].mousePressed(function(){ objlist[8].sensor_y +=  1;})
    objlist[8].increase[2][0].mousePressed(function(){ objlist[8].sensor_d +=  1;})
    objlist[8].increase[2][1].mousePressed(function(){ objlist[8].sensor_d +=0.1;})
    objlist[8].decrease[0][0].mousePressed(function(){ objlist[8].sensor_x -= 10;})
    objlist[8].decrease[0][1].mousePressed(function(){ objlist[8].sensor_x -=  1;})
    objlist[8].decrease[1][0].mousePressed(function(){ objlist[8].sensor_y -= 10;})
    objlist[8].decrease[1][1].mousePressed(function(){ objlist[8].sensor_y -=  1;})
    objlist[8].decrease[2][0].mousePressed(function(){ objlist[8].sensor_d -=  1;})
    objlist[8].decrease[2][1].mousePressed(function(){ objlist[8].sensor_d -=0.1;})

    objlist[9].increase[0][0].mousePressed(function(){ objlist[9].sensor_x += 10;})
    objlist[9].increase[0][1].mousePressed(function(){ objlist[9].sensor_x +=  1;})
    objlist[9].increase[1][0].mousePressed(function(){ objlist[9].sensor_y += 10;})
    objlist[9].increase[1][1].mousePressed(function(){ objlist[9].sensor_y +=  1;})
    objlist[9].increase[2][0].mousePressed(function(){ objlist[9].sensor_d +=  1;})
    objlist[9].increase[2][1].mousePressed(function(){ objlist[9].sensor_d +=0.1;})
    objlist[9].decrease[0][0].mousePressed(function(){ objlist[9].sensor_x -= 10;})
    objlist[9].decrease[0][1].mousePressed(function(){ objlist[9].sensor_x -=  1;})
    objlist[9].decrease[1][0].mousePressed(function(){ objlist[9].sensor_y -= 10;})
    objlist[9].decrease[1][1].mousePressed(function(){ objlist[9].sensor_y -=  1;})
    objlist[9].decrease[2][0].mousePressed(function(){ objlist[9].sensor_d -=  1;})
    objlist[9].decrease[2][1].mousePressed(function(){ objlist[9].sensor_d -=0.1;})
  }


  /* センサ〜データ間の線の表示/非表示 */
  p.displayDataLine = function(){
    for (var i=1; i<=sensor_n; i++){
      if(display_Data[0].checked()){
	objlist[i].displayLineFlg = true;
      }else{
        objlist[i].displayLineFlg = false;
      }
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
}

function increasing(i, j, k){
  objlist[i].increasing(j, k);
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
 
    this.pressedX = 0;
    this.pressedY = 0;

    this.translateFlg = false;
  }


  setup(p){
    p.createCanvas(windowW, windowH);
  }


  pressed(p){
    this.translateFlg = true;
    this.pressedX = p.mouseX;
    this.pressedY = p.mouseY;
  }


  release(){
    this.translateFlg = false;
  }

}


/* センサ */
class SensorObject {
 
  /* 各パラメータ設定 */
  constructor(sensor_data, data, sensor_id, hue, increase, decrease){
    // センサのパラメータ
    this.sensor_id = sensor_id;		// センサID
    this.sensor_x = sensor_data[0]/20;	// センサのx座標
    this.sensor_y = sensor_data[1]/20;	// センサのy座標
    this.sensor_d = sensor_data[2];	// センサの角度
    this.data = data;			// センサのデータ（配列）

　　// 押し込み時の相対位置
    this.pressedX = 0;			// 押し込み時の相対位置のx座標		
    this.pressedY = 0;			// 押し込み時の相対位置のy座標
    this.pressedDeg = 0;		// 押し込み時の相対位置の角度

    // フラグ
    this.draggedFlg = false;		// 移動のフラグ
    this.rotateFlg = false;		// 回転のフラグ
    this.displayFlg = true;		// 表示のフラグ
    this.displayLineFlg = false;	// センサ〜データ間の表示のフラグ

    // 表示パラメータ
    this.hue = hue;			// 表示の色合い（0~360）
    this.sensor_size = 18;		// センサのサイズ
    this.data_size = 3;			// データのサイズ
    this.direction_size = 4;		// 角度を表示するボックスのサイズ
    this.direction_hit_box_size = 8;	// 角度を表示するボックスの判定サイズ
    this.data_reduce_rate = 1/80;	// 表示の倍率

    this.increase = increase;
    this.decrease = decrease;
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
   
    p.pop();

    /*this.increase[0][0].mousePressed(function(){
      this.sensor_x += 10;
    });*/

  }



  /* 押し込み時の処理 */
  pressed(p){
    var r = Math.sqrt(Math.pow(p.mouseX-(this.sensor_x-display_x)*expantion_rate/max_expantion_rate, 2)
                    + Math.pow(p.mouseY-(this.sensor_y-display_y)*expantion_rate/max_expantion_rate, 2));
    var theta = p.atan2(p.mouseY-(this.sensor_y-display_y)*expantion_rate/max_expantion_rate,
                        p.mouseX-(this.sensor_x-display_x)*expantion_rate/max_expantion_rate);
    var _x = r * p.cos(theta - this.sensor_d * p.PI / 180) + (this.sensor_x-display_x)*expantion_rate/max_expantion_rate;
    var _y = r * p.sin(theta - this.sensor_d * p.PI / 180) + (this.sensor_y-display_y)*expantion_rate/max_expantion_rate;

    if ((this.sensor_x-display_x)*expantion_rate/max_expantion_rate-(this.sensor_size/2) <= _x && 
        (this.sensor_x-display_x)*expantion_rate/max_expantion_rate+(this.sensor_size/2) >= _x &&
        (this.sensor_y-display_y)*expantion_rate/max_expantion_rate-(this.sensor_size/2) <= _y && 
	(this.sensor_y-display_y)*expantion_rate/max_expantion_rate+(this.sensor_size/2) >= _y ){
      this.pressedX = (this.sensor_x-display_x)*expantion_rate/max_expantion_rate - (this.sensor_size/2) - p.mouseX;
      this.pressedY = (this.sensor_y-display_y)*expantion_rate/max_expantion_rate - (this.sensor_size/2) - p.mouseY;
      this.draggedFlg = true;
      return this.draggedFlg;
    }else if((this.sensor_x-display_x)*expantion_rate/max_expantion_rate+(this.sensor_size/2) <= _x &&
             (this.sensor_x-display_x)*expantion_rate/max_expantion_rate+150                  >= _x &&
             (this.sensor_y-display_y)*expantion_rate/max_expantion_rate-(this.direction_hit_box_size/2) <= _y &&
             (this.sensor_y-display_y)*expantion_rate/max_expantion_rate+(this.direction_hit_box_size/2) >= _y ){
      this.pressedDeg = (p.atan2(p.mouseY-(this.sensor_y-display_y)*expantion_rate/max_expantion_rate, 
                                 p.mouseX-(this.sensor_x-display_x)*expantion_rate/max_expantion_rate) - theta) * 180 / p.PI;
      this.rotateFlg = true;
      return this.rotateFlg;
    }else{
      return false;
    }
  }


  /* ドラッグ時の処理 */
  drag(p){
    if (this.draggedFlg){
      this.sensor_x = display_x + (p.mouseX + this.pressedX)*max_expantion_rate/expantion_rate;
      this.sensor_y = display_y + (p.mouseY + this.pressedY)*max_expantion_rate/expantion_rate;
    }
  }


  /* 回転時の処理 */
  rotate(p){
    if (this.rotateFlg){
      this.sensor_d = (p.atan2(p.mouseY-(this.sensor_y-display_y)*expantion_rate/max_expantion_rate,
                               p.mouseX-(this.sensor_x-display_x)*expantion_rate/max_expantion_rate) - this.pressedDeg) * 180 / p.PI;
    }
  }

  /* 離した時の処理 */
  release(){
    this.draggedFlg = false;
    this.rotateFlg = false;
  }

  
  increasing(j, k){
    this.sensor_x += 10;
    /*if (j==0){
      this.sensor_x += 9*(1-k) + 1;
    }else if (j==1){
      this.sensor_y += 9*(1-k) + 1;
    }else if (j==2){
      this.sensor_d += 0.9*(1-k) + 0.1;
    }*/
  }


  decreasing(j, k){
    if (j==0){
      this.sensor_x -= 9*k + 1;
    }else if (j==1){
      this.sensor_y -= 9*k + 1;
    }else if (j==2){
      this.sensor_d -= 0.9*k + 0.1;
    }
  }

}
