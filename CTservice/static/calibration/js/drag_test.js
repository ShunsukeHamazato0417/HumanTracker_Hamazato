
/** canvas初期化 */
var objList = [];
function setup(){
  var canvasWid = 300;
  var canvasHei = 300;
  var canvas = createCanvas(canvasWid,canvasHei);
  objList.push(new DragObject(50,50,50,50));
  objList.push(new DragObject(200,130,70,70));
  objList.push(new DragObject(10,150,120,120));
}

/** canvas更新処理 */
function draw(){
  background(128,128,128);  
  
  for(var obj of objList){
    obj.draw();
  }

}

/** ドラッグ開始時のイベント */
function mousePressed(){
  for(var i=objList.length-1;i>=0;i--){
    if(objList[i].pressed()){
      break;
    }
  }
}

/** ドラッグ中のイベント */
function mouseDragged() {
  for(var obj of objList){
    obj.drag();
  }
}

/** ドラッグ終了時のイベント */
function mouseReleased(){
  for(var obj of objList){
    obj.release();
  }
}


/** ------------ここからオブジェクトクラス------------ **/

/** ドラッグ可能なオブジェクトクラス */
var DragObject = function(x,y,wid,hei){
  this.x = x;
  this.y = y;
  this.wid = wid;
  this.hei = hei;
  this.pressedX = 0;
  this.pressedY = 0;
  this.draggedFlg = false;
}

/** 描画 */
DragObject.prototype.draw = function(){
  if(this.draggedFlg){
    fill(255,255,255);
  }else{
    fill(128,255,64);
  }
  rect(this.x,this.y,this.wid,this.hei);
}

/** ドラッグ開始判定 */
DragObject.prototype.pressed = function(){
  
  if(this.x <= mouseX && mouseX <= this.x + this.wid &&
    this.y <= mouseY && mouseY <= this.y + this.hei){
      this.pressedX = this.x - mouseX;
      this.pressedY = this.y - mouseY;
      this.draggedFlg = true;
  }
  return this.draggedFlg;
}

/** ドラッグ中 */
DragObject.prototype.drag = function(){
  if(this.draggedFlg){
    this.x = mouseX + this.pressedX;
    this.y = mouseY + this.pressedY;
  }
}

/** ドラッグ終了 */
DragObject.prototype.release = function(){
  this.draggedFlg = false;
}


/** ------------ここまでオブジェクトクラス------------ **/
