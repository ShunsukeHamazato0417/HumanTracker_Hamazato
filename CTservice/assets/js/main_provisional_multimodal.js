'use strict';
if (!window.Worker){
  console.log("You cannot use WebWorker in this browser.");
  console.log("Please use browser that supported WebWorker.")
  //exit 
}


import * as PIXI from 'pixi.js';



let sensor_n = 9;
let displaying = false; 

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
/*let grid = new PIXI.Graphics()
  .lineStyle(1, 0x444444, 1)
  .moveTo(0, app_h/2).lineTo(app_w, app_h/2)
  .moveTo(app_w/2, 0).lineTo(app_w/2, app_h);
background.addChild(grid);
app.stage.addChild(background);*/



/*########################
######## 描画処理 ######## 
########################*/
// Worker定義 
const worker = new Worker(new URL('./worker_provisional_multimodal.js', import.meta.url));
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

let time_display = new PIXI.Text('Time: --',
  {fontFamily : 'Arial',
   fontSize : 15,
   fill : 0x000000,
   align : 'center'});
time_display.x = 10;
time_display.y = 70;
info.stage.addChild(time_display);
let lag_display = new PIXI.Text('Lag: --s',
  {fontFamily : 'Arial',
   fontSize : 15,
   fill : 0x000000,
   align : 'center'});
lag_display.x = 250;
lag_display.y = 70;
info.stage.addChild(lag_display);
let fps_display = new PIXI.Text('FPS: --fps',
  {fontFamily : 'Arial',
   fontSize : 15,
   fill : 0x000000,
   align : 'center'});
fps_display.x = 400;
fps_display.y = 70;
info.stage.addChild(fps_display);



// 描画時の設定
let display_ratio = 1/60;
let supposed_app_w = 1440;
let supposed_app_h = supposed_app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]);
let app_display_ratio = app_w / supposed_app_w;
var lags = [sensor_n+1];

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
let flags = [
  {
    name : 'Centroid',
    flag : true,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'BBox',
    flag : false,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'Shape',
    flag : true,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'History',
    flag : true,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'Velocity',
    flag : false,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'Reg_Line',
    flag : false,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'Hiddens',
    flag : true,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'Coloring',
    flag : true,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  },
  {
    name : 'Grid',
    flag : false,
    box  : new PIXI.Graphics(),
    text : new PIXI.Text()
  }
]

var flags_x_init = 10;
var flags_y_init = 110;
var flags_x_width = 120;
var flags_y_width = 50;
for (var i=0; i<flags.length; i++){
  //var f = flags[i];
  flags[i].box.flag = flags[i].flag;
  if (!flags[i].box.flag){
    flags[i].box.alpha = 0.25;
  }
  flags[i].box.lineStyle(5, 0xffffff, 1, 1);
  flags[i].box.beginFill(0x000000);
  flags[i].box.drawRect(flags_x_init+flags_x_width*(i%6), flags_y_init+flags_y_width*(Math.floor(i/6)), 15, 15);
  flags[i].box.interactive = true;
  flags[i].box.buttonMode  = true;
  flags[i].box.on('pointerup', function(){
    if (this.flag){
      this.flag = false;
      this.alpha = 0.25;
    } else {
      this.flag = true;
      this.alpha = 1;
    }
  });
  info.stage.addChild(flags[i].box);

  flags[i].text.text = flags[i].name;
  flags[i].text.style = {fontFamily : 'Arial',
                  fontSize : 15,
                  fill : 0x000000,
                  algin : 'center'}
  flags[i].text.x = flags_x_init+flags_x_width*(i%6)+25;
  flags[i].text.y = flags_y_init+flags_y_width*(Math.floor(i/6));
  info.stage.addChild(flags[i].text);
}



// データの受信時処理
var display_json;
worker.addEventListener('message', function(msg){
  // if(msg.data[0].data[0]){one_display_sensor_data(msg.data[0].data[0]);}
  integration_hungarian(msg.data[0],msg.data[1]);
}, false);

var huamn_detect_area = {
  "area":[
    [20000, 3000],
    [80000, 3000],
    [80000, 44000],
    [20000, 44000]
]}
var facilities = [
  {
    "name": "DonDon",
    "area": [
      [29000, 17000],
      [51000, 17000],
      [51000, 36500],
      [29000, 36500]
    ],
    "entrances": [
        [[34000, 17000], [38000, 17000]],
        [[51000, 32000], [51000, 36500]]
    ] 
  },{
    "name": "Purchase",
    "area": [
        [35000, 3500],
        [62000, 3500],
        [62000, 10700],
        [35000, 10700]
    ],
    "entrances": [
        [[35000, 10700], [38000, 10700]],
        [[59000, 10700], [62000, 10700]]
      ]
    },{
    "name": "Famil",
    "area": [
        [80000, 3500],
        [71000, 3500],
        [71000, 10700],
        [74300, 14000],
        [70600, 17500],
        [70600, 27600],
        [77500, 34500],
        [80000, 34500]
    ],
    "entrances": [
        [[71000, 10700], [74300, 14000]]
    ]
  },{
    "name": "Barber",
    "area": [
        [64800, 3500],
        [71000, 3500],
        [71000, 10700],
        [64800, 10700]
    ],
    "entrances": [
        [[66000, 10700], [70000, 10700]]
    ]
  },{
    "name": "WereHouse",
    "area": [
      [27500, 3500],
      [35000, 3500],
      [35000, 10700],
      [27500, 10700]
      ],
    "entrances": [
        [[27500, 3500], [27500, 3500]]
    ]
  }
]

const camera_2_points = [
  { x: 28880, y: 10707 },
  { x: 28880, y: 16660 },
  { x: 48380, y: 16660 },
  { x: 48380, y: 10707 }
];

const camera_3_points = [
  { x: 56080, y: 10707 },
  { x: 51700, y: 12069 },
  { x: 51700, y: 16660 },
  { x: 52180, y: 18360 },
  { x: 52180, y: 28932 },
  { x: 70480, y: 28932 },
  { x: 70480, y: 16425 },
  { x: 74046, y: 13566 },
  { x: 70480, y: 10707 }
];

// データ描画処理
var display_w = app_w;
var display_h = app_h;
display_min_x = 0;
display_min_y = 0;
display_max_x = app_w;
display_max_y = app_h;
var scaling_ratio;
var expantion_ratio;
var data_size   = 2  / expantion_ratio;
var sensor_size = 10 / expantion_ratio;
var line_size = 80;
var grid_w = 2000;
var grid_h = 2000;
var sensor = new PIXI.Graphics();
app.stage.addChild(sensor);
var data   = new PIXI.Graphics();
var region = new PIXI.Graphics();
app.stage.addChild(data);

var static_objects = new PIXI.Container();
app.stage.addChild(static_objects);
var update_objects = new PIXI.Container();
app.stage.addChild(update_objects);
var region = new PIXI.Graphics();
app.stage.addChild(region);

var center = new PIXI.Graphics();
var bbox = new PIXI.Graphics();
var shape = new PIXI.Graphics();
var reg_line = new PIXI.Graphics();
var history = new PIXI.Graphics();
var velocity = new PIXI.Graphics();

function display_data(json){
  // console.log(json)

  time_display.text = "Time: "+ json.time;

  scaling_ratio = app_w / display_w;
  expantion_ratio = display_ratio * app_display_ratio * scaling_ratio;
  data_size   = 2  / expantion_ratio;

  update_objects.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);

  update_objects.removeChildren();
  center.clear();
  bbox.clear();
  shape.clear();
  reg_line.clear();
  history.clear();
  velocity.clear();
  
  var colf = flags.find((f) => f.name == 'Coloring');
  var cf = flags.find((f) => f.name == 'Centroid');
  var bf = flags.find((f) => f.name == 'BBox');
  var sf = flags.find((f) => f.name == 'Shape');
  var rf = flags.find((f) => f.name == 'Reg_Line');
  var hf = flags.find((f) => f.name == 'History');
  var vf = flags.find((f) => f.name == 'Velocity');


  for (var o of json.objects){
    var c = o.cluster;
    var col;
    if (colf.box.flag){
      col = colors[o.id%9];
    } else {
      /*if (o.assign_type=='hull' || o.assign_type=='hull_hidden'){ col = 0xff0000} 
        else if (o.assign_type=='bbox' || o.assign_type=='bbox_hidden'){ col = 0x00ff00}
        else if (o.assign_type=='distance' || o.assign_type=='distance_hidden'){ col = 0x0000ff}*/
      /*if (o.assign_type=='merged'){ col = 0xff0000} 
      else if (o.assign_type=='single'){ col = 0x00ff00}
      else if (o.assign_type=='distance' || o.assign_type=='distance_hidden'){ col = 0x0000ff}
      else { col = 0xffffff}*/
      if (o.status=='moving'){ col = 0xff0000} 
      else if (o.status=='stopping'){ col = 0x00ff00}
      else { col = 0xffffff}
    }
    //if (o.status=='stopping') {col = 0xffffff;}
    var alpha = 1;

    if (cf.box.flag){
      center.lineStyle(line_size, 0xffffff, alpha, 1);
      center.beginFill(0xff0000);
      center.drawCircle(c.centroid.x, c.centroid.y, 20);
      center.endFill();
    }

    if (bf.box.flag){
      bbox.lineStyle(line_size, col, alpha);
      bbox.moveTo(c.bbox.xmin, c.bbox.ymin);
      bbox.lineTo(c.bbox.xmin, c.bbox.ymax);
      bbox.lineTo(c.bbox.xmax, c.bbox.ymax);
      bbox.lineTo(c.bbox.xmax, c.bbox.ymin);
      bbox.lineTo(c.bbox.xmin, c.bbox.ymin)
    }

    if (sf.box.flag){
      shape.lineStyle(line_size, col, alpha);
      shape.moveTo(c.hull.points[c.hull.points.length-1].x, c.hull.points[c.hull.points.length-1].y);
      for (var s of c.hull.points){
        shape.lineTo(s.x, s.y);
      }
    }

    /*console.log(c.linerity);
    if (c.linerity>1){
      var liner = new PIXI.Graphics();
      liner.lineStyle(100, col, 1, 1);
      liner.beginFill(col);
      liner.drawRect(c.bbox_start.x, c.bbox_start.y, c.bbox_x_len, c.bbox_y_len);
      liner.endFill();
      update_objects.addChild(liner);
    }*/

    if (rf.box.flag){
      reg_line.lineStyle(line_size, col, alpha);
      reg_line.moveTo(c.bbox_start.x, c.regression_line.a*c.bbox_start.x+c.regression_line.b);
      reg_line.lineTo(c.bbox_start.x+c.bbox_x_len, c.regression_line.a*(c.bbox_start.x+c.bbox_x_len)+c.regression_line.b);
    }

    if (hf.box.flag){
      history.lineStyle(line_size, col, alpha);
      history.moveTo(c.centroid.x, c.centroid.y);
      for (var i=o.history.log.length-1; i>=0; i--){
        history.lineTo(o.history.log[i].location.x, o.history.log[i].location.y);
      }
    }

    if (vf.box.flag){
      //if (o.velocity.speed>5){
        velocity.lineStyle(line_size, col, alpha);
        velocity.moveTo(c.centroid.x, c.centroid.y);
        velocity.lineTo(500*o.velocity.speed*Math.cos(3.141592*o.velocity.direction/180)+c.centroid.x, 
                        500*o.velocity.speed*Math.sin(3.141592*o.velocity.direction/180)+c.centroid.y);
      //}
    }

    //console.log(c.circurity);
    //console.log(c.area);
    /*if (o.velocity.speed>5){
      console.log(o);
      console.log(o.assign_type + ": " + o.overlap);
      console.log(o.velocity.speed);
    }*/
  }


  var hiddenf = flags.find((f) => f.name == 'Hiddens');
  if (hiddenf.box.flag){
    for (var o of json.hiddens){
      var c = o.cluster;
      var col;
      if (colf.box.flag){
        col = colors[o.id%9];
      } else {
        /*if (o.assign_type=='hull' || o.assign_type=='hull_hidden'){ col = 0xff0000} 
        else if (o.assign_type=='bbox' || o.assign_type=='bbox_hidden'){ col = 0x00ff00}
        else if (o.assign_type=='distance' || o.assign_type=='distance_hidden'){ col = 0x0000ff}*/
        if (o.assign_type=='merged'){ col = 0xff0000} 
        else if (o.assign_type=='single'){ col = 0x00ff00}
        else if (o.assign_type=='distance' || o.assign_type=='distance_hidden'){ col = 0x0000ff}
        else { col = 0xffffff}
      }
      var alpha = 0.25;

      var offset_x = 0, offset_y = 0;
      //var kalman_lag = to_date(json.time).getTime() - to_date(o.history.log[o.history.log.length-1].time).getTime();
      //offset_x = o.velocity.speed*Math.cos(3.141592*o.velocity.direction/180)*kalman_lag;
      //offset_y = o.velocity.speed*Math.sin(3.141592*o.velocity.direction/180)*kalman_lag;


      if (cf.box.flag){
        center.lineStyle(line_size, 0xffffff, alpha, 1);
        center.beginFill(0xff0000);
        center.drawCircle(c.centroid.x+offset_x, c.centroid.y+offset_y, 20);
        center.endFill();
      }

      if (bf.box.flag){
        bbox.lineStyle(line_size, col, alpha);
        bbox.moveTo(c.bbox.xmin+offset_x, c.bbox.ymin+offset_y);
        bbox.lineTo(c.bbox.xmin+offset_x, c.bbox.ymax+offset_y);
        bbox.lineTo(c.bbox.xmax+offset_x, c.bbox.ymax+offset_y);
        bbox.lineTo(c.bbox.xmax+offset_x, c.bbox.ymin+offset_y);
        bbox.lineTo(c.bbox.xmin+offset_x, c.bbox.ymin+offset_y);
      }

      if (sf.box.flag){
        shape.lineStyle(line_size, col, alpha);
        shape.moveTo(c.hull.points[c.hull.points.length-1].x+offset_x, c.hull.points[c.hull.points.length-1].y+offset_y);
        for (var s of c.hull.points){
          shape.lineTo(s.x+offset_x, s.y+offset_y);
        }
      }

      /*console.log(c.linerity);
      if (c.linerity>1){
        var liner = new PIXI.Graphics();
        liner.lineStyle(100, col, 1, 1);
        liner.beginFill(col);
        liner.drawRect(c.bbox_start.x, c.bbox_start.y, c.bbox_x_len, c.bbox_y_len);
        liner.endFill();
        update_objects.addChild(liner);
      }*/

      if (rf.box.flag){
        reg_line.lineStyle(line_size, col, alpha);
        reg_line.moveTo(c.bbox_start.x+offset_x, c.regression_line.a*c.bbox_start.x+c.regression_line.b+offset_y);
        reg_line.lineTo(c.bbox_start.x+c.bbox_x_len+offset_x, c.regression_line.a*(c.bbox_start.x+c.bbox_x_len)+c.regression_line.b+offset_y);
      }

      if (hf.box.flag){
        history.lineStyle(line_size, col, alpha);
        history.moveTo(c.centroid.x+offset_x, c.centroid.y+offset_y);
        for (var i=o.history.log.length-1; i>=0; i--){
          history.lineTo(o.history.log[i].location.x, o.history.log[i].location.y);
        }
      }

      //console.log(o.velocity.speed);
      if (vf.box.flag){
        velocity.lineStyle(line_size, col, alpha);
        velocity.moveTo(c.centroid.x+offset_x, c.centroid.y+offset_y);
        velocity.lineTo(500*o.velocity.speed*Math.cos(3.141592*o.velocity.direction/180)+c.centroid.x+offset_x, 
                        500*o.velocity.speed*Math.sin(3.141592*o.velocity.direction/180)+c.centroid.y+offset_y);
      }

      //console.log(c.circurity);
      //console.log(c.area);
      //console.log(o.assign_type + ": " + o.overlap);
    }
  }
  
    update_objects.addChild(bbox);
    update_objects.addChild(shape);
    update_objects.addChild(reg_line);
    update_objects.addChild(history);
    update_objects.addChild(velocity);
    update_objects.addChild(center);
  
    now = new Date();
    time = to_date(json.time);
    lag  = now.getTime() - time.getTime();
  
  
    /**
     * static objects
     */
    static_objects.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
    static_objects.removeChildren();
  
    var area = new PIXI.Graphics();
    static_objects.addChild(area);
    area.clear();
    area.lineStyle(100, 0xffffff, 100)
        .moveTo(huamn_detect_area.area[huamn_detect_area.area.length-1][0], huamn_detect_area.area[huamn_detect_area.area.length-1][1]);
    for (var p in huamn_detect_area.area){
      area.lineTo(huamn_detect_area.area[p][0], huamn_detect_area.area[p][1]);
    }
  
    var facility = new PIXI.Graphics();
    static_objects.addChild(facility);
    facility.clear();
    facility.lineStyle(100, 0xffffff, 100);
    for (var f of facilities){
      facility.moveTo(f.area[f.area.length-1][0], f.area[f.area.length-1][1]);
      for (var p in f.area){
        facility.lineTo(f.area[p][0], f.area[p][1]);
      }
    }
    facility.lineStyle(400, 0x00ff00, 400);
    for (var f of facilities){
      for (var p in f.entrances){
        facility.moveTo(f.entrances[p][0][0], f.entrances[p][0][1]);
        facility.lineTo(f.entrances[p][1][0], f.entrances[p][1][1]);
      }
    }

    var gridf = flags.find((f) => f.name == 'Grid');
    if (gridf.box.flag){
      var cells = new PIXI.Graphics();
      static_objects.addChild(cells);
      cells.clear();
      cells.lineStyle(80, 0xdddddd, 80, 0.3);
      var xmin = huamn_detect_area.area[0][0];
      var ymin = huamn_detect_area.area[0][1];
      var xmax = huamn_detect_area.area[huamn_detect_area.area.length-2][0];
      var ymax = huamn_detect_area.area[huamn_detect_area.area.length-2][1];
      var x = xmin + grid_w;
      var y = ymin + grid_h;
      while (x < xmax){
        cells.moveTo(x, ymin);
        cells.lineTo(x, ymax);
        x += grid_w;
      }
      while (y < ymax){
        cells.moveTo(xmin, y);
        cells.lineTo(xmax, y);
        y += grid_h;
      }
    }

  fps_count++;
}


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
  
  for (var i=0; i<json.data.length; i++){
    if(json.data[i]){
      for (var j=0; j<json.data[i].length; j ++){
        var c = colors[json.data[i][j][2] % 9];

        data.beginFill(c);
        data.drawRect(json.data[i][j][0] - data_size/2, 
                      json.data[i][j][1] - data_size/2,
            data_size*2, data_size*2)
        data.endFill();
      }
    }
  }

  
    // for (var j=0; j<json.data.length; j += 1){
      
    //     var c = basic_data_color;

    //     data.beginFill(c);
    //     data.drawRect(json.data[j][0] - data_size/2, 
    //                   json.data[j][1] - data_size/2,
  	// 	      data_size, data_size)
    //     data.endFill();
      
    // }
  
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
    time = to_date(json[i].det_time);
    now = new Date();
    
    // console.log(json[i].det_time);
    // console.log(now.getTime());
    console.log(time.getTime());
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

function display_fusion_data(json){
  // console.log(json);
  displaying = true;
  scaling_ratio = app_w / display_w;
  expantion_ratio = display_ratio * app_display_ratio * scaling_ratio;
  data.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  sensor.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  data_size   = 2  / expantion_ratio;
  sensor_size = 10 / expantion_ratio;

  sensor.clear();
  data.clear();
  
  for (var i=0; i<json.length; i++){
    if (json[i]){
      // var c = colors[0];
      if(json[i].info=="multimodal"){
        var c = colors[0];
      }else if(json[i].info=="camera"){
        var c = colors[1];
      }else{
        var c = colors[2];
      }

      data.beginFill(c);
      data.drawRect(json[i].x - data_size/2, 
                    json[i].y - data_size/2,
          data_size*2, data_size*2)
      data.endFill();
    }
   
  }
  // for (var i=1; i<json.length; i++){
  //   var c;
  //   /*if (display_sensor[0]){c = basic_sensor_color;} 
  //   else {c = colors[i-1];}*/
  //   c = colors[i-1];
  //   sensor.lineStyle(100, 0xffffff, 1, 1);
  //   sensor.beginFill(c);
  //   sensor.drawRect(json[i].x - sensor_size/2, 
	//       json[i].y - sensor_size/2, 
  //      	      sensor_size, sensor_size);
  //   sensor.endFill();
  //   time = to_date_c(json[i].det_time);
  //   now = new Date();
    
  //   // console.log(json[i].det_time);
  //   // console.log(now.getTime());
  //   // console.log(time.getTime());
  //   lag  = now.getTime() - time.getTime();
  //   lags[0] += lag;
  //   lags[i] += lag;
  // }
  

  fps_count++;

  //drawing = now.getTime() - start.getTime();
  //wait = (now.getTime() - pre_get_time.getTime()) - drawing;
  //lag_display.text = 'Lag: ' + lag + 's';
  //drawing_display.text = 'Drawing: ' + drawing + 'ms';
  //wait_display.text = 'Wait: ' + wait + 'ms';

  displaying = false;
}


function display_accumulated_fusion_data(json){
  // console.log(json);
  // time_display.text = "Time: "+ json.time;
  displaying = true;
  scaling_ratio = app_w / display_w;
  expantion_ratio = display_ratio * app_display_ratio * scaling_ratio;
  data.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  region.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  sensor.setTransform(-display_min_x*scaling_ratio, -display_min_y*scaling_ratio, expantion_ratio, expantion_ratio);
  data_size   = 2  / expantion_ratio;
  sensor_size = 10 / expantion_ratio;

  sensor.clear();
  data.clear();
  region.clear();
  
  for (var i=0; i<json.length; i++){
    if (json[i]){
      if(json[i].trust>0){
        var c = colors[json[i].id%9];
        if(json[i].status=="tracking"){
          var clarity = 1;
        }else{
          var clarity = 0.5;
        }
        

        data.beginFill(c, clarity);
        for(let j=0; j<json[i].history.log.length;j++){
          data.drawRect(json[i].history.log[j].location.x - data_size/2, 
                      json[i].history.log[j].location.y - data_size/2,
              data_size*1.5, data_size*1.5)
        }
        
        data.endFill();

        // //変更点
        // data.lineStyle(80, c, 1);
        // data.moveTo(json[i].history.log[0].location.x, json[i].history.log[0].location.y);
        // for(let j=1; j<json[i].history.log.length;j++){
        //   data.lineTo(json[i].history.log[j].location.x , json[i].history.log[j].location.y);
        // }

        // data.endFill();
      }else{
        // console.log(json[i]);
      }
      // else{
      //   var c = colors[json[i].id%9];
      //   if(json[i].status=="tracking"){
      //     var clarity = 1;
      //   }else{
      //     var clarity = 0.5;
      //   }
        

      //   data.beginFill(c, 0.1);
      //   for(let j=0; j<json[i].history.log.length;j++){
      //     data.drawRect(json[i].history.log[j].location.x - data_size/2, 
      //                 json[i].history.log[j].location.y - data_size/2,
      //         data_size*3, data_size*3)
      //   }
        
      //   // console.log(json[i]);
      //   data.endFill();
      // }
        
    }
   
  }
  

  region.lineStyle(2/expantion_ratio, 0XCC3299, 1); // 線の太さ、色、不透明度を設定
  region.moveTo(camera_2_points[0].x, camera_2_points[0].y); // 最初の点に移動
  // console.log(camera_2_points);
  for (var i = 1; i < camera_2_points.length; i++) {
    region.lineTo(camera_2_points[i].x, camera_2_points[i].y); // 次の点に直線を描く
    // console.log("a")
  }
  region.lineTo(camera_2_points[0].x, camera_2_points[0].y); // 最後に最初の点に戻って閉じる
  region.endFill();

  region.lineStyle(2/expantion_ratio, 0XCC3299, 1); // 線の太さ、色、不透明度を設定
  region.moveTo(camera_3_points[0].x, camera_3_points[0].y); // 最初の点に移動
  // console.log(camera_3_points);
  for (var i = 1; i < camera_3_points.length; i++) {
    region.lineTo(camera_3_points[i].x, camera_3_points[i].y); // 次の点に直線を描く
    // console.log("a")
  }
  region.lineTo(camera_3_points[0].x, camera_3_points[0].y); // 最後に最初の点に戻って閉じる
  region.endFill();
  

  fps_count++;

  //drawing = now.getTime() - start.getTime();
  //wait = (now.getTime() - pre_get_time.getTime()) - drawing;
  //lag_display.text = 'Lag: ' + lag + 's';
  //drawing_display.text = 'Drawing: ' + drawing + 'ms';
  //wait_display.text = 'Wait: ' + wait + 'ms';

  displaying = false;
}

var lag_init = 0;

function FpsDisplay(){
  if (lag_init==0){lag_init = Math.floor(lag/(fps_count*sensor_n))/1000;}
  lag_display.text = 'Lag: ' + Math.floor(lag/(fps_count*sensor_n))/1000 + 's';
  fps_display.text = 'FPS: ' + fps_count + 'fps';

  lag = 0;
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

var correspondence_id = []; //カメラとライダーの対応表
var c_correspond_id = []; //対応付済みのカメラのid
var d_correspond_id = []; //対応付済みの測域センサのid
var lidar_objects_id = []; //ライダーに含まれるオブジェクトのid
var new_multimodal_data = [];

// ここから統合のための関数
var cost = []
var camera = []
var lidar = []

// カメラとライダーのマッチングしたidを保存
var camera_lidar_match_id = []

//lidarで看板や扉などを検出したけど、人と判断したもの
var lidar_wrong_decision = []

function angle_difference(camera_track, lidar_track) {
  let angle_difference_sum = 0;
  let i = 2;
  while(i < camera_track.length && 2 * i < lidar_track.history.log.length) {
      let cam_dx = camera_track[camera_track.length-i][0] - camera_track[camera_track.length-i-1][0];
      let cam_dy = camera_track[camera_track.length-i][1] - camera_track[camera_track.length-i-1][1];
      let lidar_dx = lidar_track.history.log[lidar_track.history.log.length-(2*i-1)].location.x - lidar_track.history.log[lidar_track.history.log.length-(2*i-3)].location.x;
      let lidar_dy = lidar_track.history.log[lidar_track.history.log.length-(2*i-1)].location.y - lidar_track.history.log[lidar_track.history.log.length-(2*i-3)].location.y;

      let cam_angle = Math.atan2(cam_dy, cam_dx);
      let lidar_angle = Math.atan2(lidar_dy, lidar_dx);

      let angle_diff = Math.abs(cam_angle - lidar_angle);
      angle_difference_sum += angle_diff;
      i++;
  }
  return angle_difference_sum / i;  // 平均化
}

function distance_measurement(camera_track,lidar_track){
  let i=1;
  var distance=0;
  // console.log(camera_track);
  // console.log(lidar_track.log.length);
  while(i<=camera_track.length && 2*i<=lidar_track.history.log.length){
    // console.log(i);
    // console.log(camera_track[camera_track.length-i][0]);
    // console.log(lidar_track.log[lidar_track.log.length-(2*i-1)]);
    let frame_distance= Math.sqrt(Math.pow(camera_track[camera_track.length-i][0]-lidar_track.history.log[lidar_track.history.log.length-(2*i-1)].location.x,2) + Math.pow(camera_track[camera_track.length-i][1]-lidar_track.history.log[lidar_track.history.log.length-(2*i-1)].location.y,2));
    distance+=frame_distance;
    i++;
  }
  distance=distance/i;

  let angle_diff = 0;
  // let angle_diff = angle_difference(camera_track, lidar_track);
  let shape_cost = angle_diff;  // 角度差をコストに組み込む

  // console.log(camera_track[0][2]);
  // console.log(camera_lidar_match_id[i][0]);
  for(let j=0;j<camera_lidar_match_id.length;j++){
    if(camera_track[0][2]==camera_lidar_match_id[j][0] && lidar_track.id==camera_lidar_match_id[j][1]){
      distance=distance/2;
      // console.log("aa");
    }
  }
  // console.log(distance);
  return distance + shape_cost;
}

function integration(json_c, json_d){
  cost=[] // カメラとLiDAR検出のマッチングのためのコスト関数のリセット（カメラの検出数）*（LiDARの検出数）
  camera = []
  lidar = []
  let cam_det_num = 0
  // lidarのhiddenもjson_d.objectsに入れる
  for(let i=0;i<json_d.hiddens.length;i++){
    json_d.objects.push(json_d.hiddens[i]);
  }

  for(let i=0; i<json_c.existing_id.length;i++){
    camera.push(json_c.existing_id[i]);
  }
  for(let i=0;i<json_d.objects.length;i++){
    if(!lidar_wrong_decision.includes(json_d.objects[i].id)){
      lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
    }else{
      json_d.objects[i].type.current="statics";
      lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
    }
  }
  
  // console.log(json_d.objects[0].type)
  // console.log(lidar)

  // コストを計算していく
  for(let i=0; i<json_c.data.length;i++){
    var camera_position = json_c.data[i] // カメラで検出したオブジェクトの位置
    cost.push(new Array(json_d.objects.length));
    // console.log(camera_position)
    for(let k=0;k<json_d.objects.length;k++){
      // console.log(json_d.objects[k].type);
      if(json_d.objects[k].type.current!="statics"){
        var lidar_position = json_d.objects[k].history;
        // var data_distance = Math.sqrt( Math.pow(camera_position[0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));

        var data_distance;
        // 軌跡を用いてカメラとLiDARのマッチングを行う。まずは軌跡の距離を見てコストを計算
        if(camera_position.length>2 && lidar_position.log.length>4){
          data_distance = (Math.sqrt( Math.pow(camera_position[camera_position.length-1][0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[camera_position.length-1][1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ))
                          + Math.sqrt( Math.pow(camera_position[camera_position.length-3][0] - lidar_position.log[lidar_position.log.length-5].location.x, 2 ) + Math.pow( camera_position[camera_position.length-3][1] - lidar_position.log[lidar_position.log.length-5].location.y, 2 )))/2;
        }else{
          data_distance = Math.sqrt( Math.pow(camera_position[camera_position.length-1][0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[camera_position.length-1][1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));
        }
        // console.log(data_distance);
        // if(data_distance<4000){console.log(data_distance)} 
        if(data_distance<4000){
          cost[cam_det_num][k] = 1000/data_distance;
        }
        else{
          cost[cam_det_num][k] = 0
        }
        // console.log(cost)
        // if()
        // cost[i][j] = 
      }else{
        cost[cam_det_num][k] = 0
      }
    }
    cam_det_num++; 
  }
  // if(cost[0]){console.log(cost[0]);}

  // costを元にGala-Shapleyアルゴリズムを適用
  // priorityにカメラ、ライダーのマッチングしたい対象を保存
  // matchに対応付けしたカメラとlidarのidを保存
  var c_priority=[];
  var l_priority=[];
  var match=[];
  // c_priprityから決定
  for(let i=0;i<cost.length;i++){
    let c_id;
    let l_id_no1=-1;
    let l_id_no2=-1;
    let l_id_no3=-1;
    let max1=0;
    let max2=0;
    let max3=0;
    c_id=i;
    for(let j=0;j<cost[i].length;j++){
      if(cost[i][j]>max1){
        max3=max2;
        max2=max1;
        max1=cost[i][j];
        l_id_no3=l_id_no2;
        l_id_no2=l_id_no1;
        l_id_no1=j;
      }else if(cost[i][j]>max2 && cost[i][j]<max1){
        max3=max2;
        max2=cost[i][j];
        l_id_no3=l_id_no2;
        l_id_no2=j;
      }else if(cost[i][j]>max3 && cost[i][j]<max2){
        max3=cost[i][j];
        l_id_no3=j;
      }
    }
    c_priority[c_id] =  [camera[c_id], lidar[l_id_no1],lidar[l_id_no2],lidar[l_id_no3]];
  }
  // console.log(c_priority);

  // l_priorityも決定
  if(cost[0]){
    for(let i=0;i<cost[0].length;i++){
      let l_id;
      let c_id_no1=-1;
      let c_id_no2=-1;
      let c_id_no3=-1;
      let max1=0;
      let max2=0;
      let max3=0;
      l_id=i;
      for(let j=0;j<cost.length;j++){
        if(cost[j][i]>max1){
          max3=max2;
          max2=max1;
          max1=cost[j][i];
          c_id_no3=c_id_no2;
          c_id_no2=c_id_no1;
          c_id_no1=j;
        }else if(cost[j][i]<max1 && cost[j][i]>max2){
          max3=max2;
          max2=cost[j][i];
          c_id_no3=c_id_no2;
          c_id_no2=j;
        }else if(cost[j][i]<max2 && cost[j][i]>max3){
          max3=cost[j][i];
          c_id_no3=j;
        }
      }
      l_priority[l_id] =  [lidar[l_id], camera[c_id_no1],camera[c_id_no2],camera[c_id_no3]];
    }
  }
  // console.log(l_priority);

  // matching処理
  for(let i= 0;i<c_priority.length;i++){
    match[i]=[c_priority[i][0],c_priority[i][1]];
  }
  // console.log(match)
  // matchingの際に複数のカメラ検出が一つのライダーにマッチングしたときできるだけ対処、ただ、一つのライダーの検出に複数のカメラの検出が対応づくことはあるので許容も
  for(let i=0;i<match.length;i++){
    if(match[i][1]){
      let lidar_id = match[i][1][0];
      let camera_id1=match[i][0];
      var camera_priority1 = c_priority[i];
      // 面積がある値以下ならマッチングの際に間違っている可能性があるので修正
      // console.log(match[i][1]);
      if(match[i][1][1]<300000){ ////////////////////////////////////////////////////////
        for(let j=0;j<match.length;j++){
          if(match[j][1]){
            if(i!=j && match[j][1][0]==lidar_id){
              let camera_id2=match[j][0];
              var camera_priority2 = c_priority[j];
              for(let k=0;k<lidar.length;k++){
                if(lidar[k][0]==lidar_id){
                  //l_priorityを参照し、優先順位順にカメラとのマッチングを決定（）
                  for(let l=0;l<l_priority[k].length;l++){
                    // camera_id1の方が優先順位が高い場合、camera_id2のmatchingを変更
                    if(l_priority[k][l]==camera_id1){
                      if(camera_priority2[2]){match[j][1] = camera_priority2[2]}
                      break;
                    }
                    // camera_id1の方が優先順位が高い場合、camera_id2のmatchingを変更
                    if(l_priority[k][l]==camera_id2){
                      if(camera_priority1[2]){match[i][1] = camera_priority1[2]}
                      break;
                    }
                  }
                  break; //　ここはいらないかも
                }
              }
            }
          }
        }
      }else{

      }
    }
  }
  // console.log(match);

  // matchからnew_detectionを出力
  var new_detection = [];
  for(let i=0;i<match.length;i++){
    // matchを参照し、カメラだけで検出したオブジェクト、カメラとライダーで検出したオブジェクト(matchしたやつ)をnew_detectionに保存
    var position;
    // カメラとライダーで検出したオブジェクト
    if(match[i][1]){
      // LiDARが複数人を一人として検出している可能性がある場合
      if(match[i][1][1]>300000){
        let c_id = match[i][0];
        for(let j=0; j<json_c.data.length;j++){
          // console.log(json_c.data[j][0]);
          if(json_c.data[j][0][2]==c_id){
            // position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
            position ={
              x: json_c.data[j][0][0],
              y: json_c.data[j][0][1],
              info:"camera",
              camera_id:c_id,
              lidar_id:match[i][1][0],
              naigai:true
            }
            // console.log(position);
          }
        }
      }
      // 正常にマッチングされたカメラとLiDARの処理
      else{
        let l_id = match[i][1][0];
        for(let j=0;j<json_d.objects.length;j++){
          if(json_d.objects[j].id==l_id){
            position ={
              x:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.x,
              y:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.y,
              info:"multimodal",
              camera_id:match[i][0],
              lidar_id:l_id,
              naigai:false
            }
            position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon)
          }
        }
      }
      // console.log(match[i][1]);
     
    }
    // カメラだけで検出したオブジェクト
    else{
      // console.log(match[i][1]);
      let c_id = match[i][0];
      // console.log("only_camera_detect", c_id);
      for(let j=0; j<json_c.data.length;j++){
        // console.log(json_c.data[j][0]);
        if(json_c.data[j][0][2]==c_id){
          position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
          position ={
            x: json_c.data[j][0][0],
            y: json_c.data[j][0][1],
            info:"camera",
            camera_id:c_id,
            lidar_id:null,
            naigai:true
          }
          // console.log(position);
        }
        
      }
    }

    new_detection.push(position);
  }
  // console.log(new_detection);

  // lidarのみで検出しているオブジェクトもnew_detectionに格納

  loop:for(let i=0;i<json_d.objects.length;i++){
    let l_id = json_d.objects[i].id;
    var position;
    for(let j=0;j<match.length;j++){
      if(match[j][1]){
        if(match[j][1][0]==l_id){
          continue loop;
        }
      }
    }
    if(json_d.objects[i].type.current!="statics" ){
      position={
        x: json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x,
        y:  json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,
        info:"lidar",
        camera_id:null,
        lidar_id:l_id,
        naigai:false
      }
      position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon);
      if(position.naigai){

      }else{
        position.naigai=isPointInPolygon(position.x,position.y,camera_2_polygon);
        // if(position.naigai){console.log(position)}
      }
      // position=[json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x, json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,1]
      new_detection.push(position);
    }
  }
  // console.log(json_d.objects[0]);

  // display_fusion_data(new_detection)
  // return new_detection

  track_detection_match(new_detection)
}

var camera_lidar_id=[];
function integration_hungarian(json_c, json_d){
  // console.log(json_c);
  time_display.text = "Time: "+ json_d.time;
  cost=[] // カメラとLiDAR検出のマッチングのためのコスト関数のリセット（カメラの検出数）*（LiDARの検出数）
  // var camera_lidar_id;
  camera = []
  lidar = []
  let cam_det_num = 0
  // lidarのhiddenもjson_d.objectsに入れる
  for(let i=0;i<json_d.hiddens.length;i++){
    json_d.objects.push(json_d.hiddens[i]);
  }

  for(let i=0; i<json_c.existing_id.length;i++){
    camera.push(json_c.existing_id[i]);
  }
  for(let i=0;i<json_d.objects.length;i++){
    // lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
    if(!lidar_wrong_decision.includes(json_d.objects[i].id)){
      lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
    }else{
      json_d.objects[i].type.current="statics";
      lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
    }
  }
  
  // console.log(json_d.objects[0].type)
  // console.log(lidar)

  // コストを計算していく
  for(let i=0; i<json_c.data.length;i++){
    var camera_position = json_c.data[i] // カメラで検出したオブジェクトの位置
    cost.push(new Array(json_d.objects.length));
    var lidar_id=null;
    // console.log(json_c.data[i][0]);
    for(let j=0;j<camera_lidar_id.length;j++){
      // console.log(camera_lidar_id)
      if(json_c.data[i][0][2]==camera_lidar_id[j].camera_id){
        lidar_id=camera_lidar_id[j].lidar_id;
        // console.log("aaa")
      }
    }
    // console.log(camera_position[camera_position.length-1][3]);
    // console.log(camera_position)
    for(let k=0;k<json_d.objects.length;k++){
      // console.log(json_d.objects[k].type.current);
      if(json_d.objects[k].type.current!="statics"){
        var lidar_position = json_d.objects[k];
        // var data_distance = Math.sqrt( Math.pow(camera_position[0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));

        var data_distance;
        data_distance = distance_measurement(camera_position,lidar_position);
        // console.log(data_distance);
        if(lidar_id==json_d.objects[k].id){
          data_distance=data_distance/2;
          // console.log("bbb");
        }
        //costに距離を入れていく
        cost[cam_det_num][k] = data_distance;
      
        // console.log(cost);
        // console.log(json_c);
        // console.log(json_d);
        // if()
        // cost[i][j] = 
      }else{
        cost[cam_det_num][k] = 3001 //どうなるかなぁ
        // console.log(json_d.objects[k].type.current);
        // console.log(json_d.objects[k]);
        if(json_d.objects[k].type.current!="statics"){
          console.log(json_d.objects[k].type.current);
        }
      }
    }
    cam_det_num++; 
  }
  // console.log(cost);

  var result;
  var match = [];
  camera_lidar_match_id=[];
  if(cost[0]){
    const hungarian = new HungarianAlgorithm(cost);
    result = hungarian.findMatching();

    // console.log(result);

    for(let i=0;i<result.length;i++){
      match.push([i,result[i]]);
    }
    
    for(let i=0;i<match.length;i++){
      if(cost[i][result[i]]>2000){
        // console.log(json_c.data[i]);
        // console.log(json_d.objects[result[i]]);
        match[i][1]=null;
        // console.log(match[i][1])
      }else{
        camera_lidar_match_id.push([json_c.data[match[i][0]][0][2],json_d.objects[match[i][1]].id]);
      }
    }
    // console.log(camera_lidar_match_id);
    // console.log(match);
    // console.log(cost);
    
    // camera_lidar_match_id=[];
    // console.log(camera_lidar_match_id);
  }

  camera_lidar_id=[];

  // matchからnew_detectionを出力
  var new_detection = [];
  for(let i=0;i<match.length;i++){
    // matchを参照し、カメラだけで検出したオブジェクト、カメラとライダーで検出したオブジェクト(matchしたやつ)をnew_detectionに保存
    var position;
    // カメラとライダーで検出したオブジェクト
    if(match[i][1]!=null){
      // LiDARが複数人を一人として検出している可能性がある場合
      // if(match[i][1][1]>300000){
      //   let c_id = match[i][0];
      //   for(let j=0; j<json_c.data.length;j++){
      //     // console.log(json_c.data[j][0]);
      //     if(json_c.data[j][0][2]==c_id){
      //       // position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
      //       position ={
      //         x: json_c.data[j][0][0],
      //         y: json_c.data[j][0][1],
      //         info:"camera",
      //         camera_id:c_id,
      //         lidar_id:match[i][1][0],
      //         naigai:true
      //       }
      //       // console.log(position);
      //     }
      //   }
      // }
      // 正常にマッチングされたカメラとLiDARの処理
      // else{
      //   let l_id = match[i][1][0];
      //   for(let j=0;j<json_d.objects.length;j++){
      //     if(json_d.objects[j].id==l_id){
      //       position ={
      //         x:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.x,
      //         y:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.y,
      //         info:"multimodal",
      //         camera_id:match[i][0],
      //         lidar_id:l_id,
      //         naigai:false
      //       }
      //       position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon)
      //     }
      //   }
      // }
      let c_id = json_c.data[match[i][0]][0][2];
      let l_id = json_d.objects[match[i][1]].id;
      for(let j=0;j<json_d.objects.length;j++){
        if(json_d.objects[j].id==l_id){
          position ={
            x:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.x,
            y:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.y,
            camera_position:{
              x: json_c.data[match[i][0]][0][0],
              y: json_c.data[match[i][0]][0][1],
              pre_x:json_c.data[match[i][0]][1][0],
              pre_y: json_c.data[match[i][0]][1][1],
              bb: json_c.data[match[i][0]][0][4],
              camera_num: json_c.data[match[i][0]][0][3],
            },
            info:"multimodal",
            camera_id:c_id,
            lidar_id:l_id,
            naigai:false
          }
          position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon)
          new_detection.push(position);
          // console.log("aa");
          camera_lidar_id.push({camera_id:c_id, lidar_id:l_id})
        }
      }
     
    }else{  // カメラだけで検出したオブジェクト
      // console.log(match[i][1]);
      let c_id = json_c.data[match[i][0]][0][2];
      // console.log("only_camera_detect", i);
      for(let j=0; j<json_c.data.length;j++){
        // console.log(json_c.data[j][0]);
        if(json_c.data[j][0][2]==c_id){
          // position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
          position ={
            x: json_c.data[j][0][0],
            y: json_c.data[j][0][1],
            info:"camera",
            camera_id:c_id,
            lidar_id:null,
            naigai:true
          }
          new_detection.push(position);
          // console.log("bb");
        }
      }
    }
    // console.log(position);

    // new_detection.push(position);
  }
  // console.log(match);


  // matchをもとにマッチ済みのライダーのidを格納
  var lidar_list =[];
  for(let i=0;i<match.length;i++){
    if(match[i][1]!=null){
      lidar_list.push(json_d.objects[match[i][1]].id)
    }
  }
  // console.log(lidar_list);

  // lidarのみで検出しているオブジェクトもnew_detectionに格納

  for(let i=0;i<json_d.objects.length;i++){
    if(lidar_list.includes(json_d.objects[i].id)){
      // console.log("あり")
    }else{
      // console.log("なし")
      if(json_d.objects[i].type.current!="statics" ){
      
        position={
          x: json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x,
          y:  json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,
          info:"lidar",
          info2:json_d.objects[i],
          camera_id:null,
          lidar_id:json_d.objects[i].id,
          naigai:false
        }
        position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon);
        if(position.naigai){
  
        }else{
          position.naigai=isPointInPolygon(position.x,position.y,camera_2_polygon);
          // if(position.naigai){console.log(position)}
        }
        
        new_detection.push(position);
      }
    }
  }

  for (let i=0;i<new_detection.length;i++){
    if(new_detection[i].info=="multimodal"){
      var camera_posi=[new_detection[i].camera_position.x, new_detection[i].camera_position.y,new_detection[i].camera_position.pre_x, new_detection[i].camera_position.pre_y, new_detection[i].camera_position.bb[0],new_detection[i].camera_position.bb[1],new_detection[i].camera_position.bb[2],new_detection[i].camera_position.bb[3]]
      var lidar_posi=[new_detection[i].x, new_detection[i].y]
      if(Math.sqrt( Math.pow(camera_posi[0] - lidar_posi[0], 2 ) + Math.pow( camera_posi[1] - lidar_posi[1], 2 ))<2000){
        if(new_detection[i].camera_position.camera_num==2){
          console.log("カメラと実際の位置",camera_posi,lidar_posi);
        }
        // console.log("カメラと実際の位置",camera_posi,lidar_posi);
      }
    }
  }

  track_detection_match(new_detection)
}

function integration_no_update(json_c, json_d){
  cost=[] // カメラとLiDAR検出のマッチングのためのコスト関数のリセット（カメラの検出数）*（LiDARの検出数）
  camera = []
  lidar = []
  let cam_det_num = 0
  // lidarのhiddenもjson_d.objectsに入れる
  for(let i=0;i<json_d.hiddens.length;i++){
    json_d.objects.push(json_d.hiddens[i]);
  }

  for(let i=0; i<json_c.existing_id.length;i++){
    camera.push(json_c.existing_id[i]);
  }
  for(let i=0;i<json_d.objects.length;i++){
    lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
  }
  
  // console.log(camera)
  // console.log(lidar)

  // コストを計算していく
  for(let i=0; i<json_c.data.length;i++){
    var camera_position = json_c.data[i] // カメラで検出したオブジェクトの位置
    cost.push(new Array(json_d.objects.length));
    // console.log(camera_position)
    for(let k=0;k<json_d.objects.length;k++){
      // console.log(json_d.objects[k].type);
      if(json_d.objects[k].type.current){
        var lidar_position = json_d.objects[k].history;
        // var data_distance = Math.sqrt( Math.pow(camera_position[0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));

        var data_distance;
        // 軌跡を用いてカメラとLiDARのマッチングを行う。まずは軌跡の距離を見てコストを計算
        if(camera_position.length>2 && lidar_position.log.length>4){
          data_distance = (Math.sqrt( Math.pow(camera_position[camera_position.length-1][0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[camera_position.length-1][1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ))
                          + Math.sqrt( Math.pow(camera_position[camera_position.length-3][0] - lidar_position.log[lidar_position.log.length-5].location.x, 2 ) + Math.pow( camera_position[camera_position.length-3][1] - lidar_position.log[lidar_position.log.length-5].location.y, 2 )))/2;
        }else{
          data_distance = Math.sqrt( Math.pow(camera_position[camera_position.length-1][0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[camera_position.length-1][1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));
        }
        // console.log(data_distance);
        // if(data_distance<4000){console.log(data_distance)} 
        if(data_distance<2000){
          cost[cam_det_num][k] = 1000/data_distance;
        }
        else{
          cost[cam_det_num][k] = 0
        }
        // console.log(cost)
        // if()
        // cost[i][j] = 
      }else{
        cost[cam_det_num][k] = 0
      }
    }
    cam_det_num++; 
  }
  // if(cost[0]){console.log(cost[0]);}

  // costを元にGala-Shapleyアルゴリズムを適用
  // priorityにカメラ、ライダーのマッチングしたい対象を保存
  // matchに対応付けしたカメラとlidarのidを保存
  var c_priority=[];
  var l_priority=[];
  var match=[];
  // c_priprityから決定
  for(let i=0;i<cost.length;i++){
    let c_id;
    let l_id_no1=-1;
    let l_id_no2=-1;
    let l_id_no3=-1;
    let max1=0;
    let max2=0;
    let max3=0;
    c_id=i;
    for(let j=0;j<cost[i].length;j++){
      if(cost[i][j]>max1){
        max3=max2;
        max2=max1;
        max1=cost[i][j];
        l_id_no3=l_id_no2;
        l_id_no2=l_id_no1;
        l_id_no1=j;
      }else if(cost[i][j]>max2 && cost[i][j]<max1){
        max3=max2;
        max2=cost[i][j];
        l_id_no3=l_id_no2;
        l_id_no2=j;
      }else if(cost[i][j]>max3 && cost[i][j]<max2){
        max3=cost[i][j];
        l_id_no3=j;
      }
    }
    c_priority[c_id] =  [camera[c_id], lidar[l_id_no1],lidar[l_id_no2],lidar[l_id_no3]];
  }
  // console.log(c_priority);

  // l_priorityも決定
  if(cost[0]){
    for(let i=0;i<cost[0].length;i++){
      let l_id;
      let c_id_no1=-1;
      let c_id_no2=-1;
      let c_id_no3=-1;
      let max1=0;
      let max2=0;
      let max3=0;
      l_id=i;
      for(let j=0;j<cost.length;j++){
        if(cost[j][i]>max1){
          max3=max2;
          max2=max1;
          max1=cost[j][i];
          c_id_no3=c_id_no2;
          c_id_no2=c_id_no1;
          c_id_no1=j;
        }else if(cost[j][i]<max1 && cost[j][i]>max2){
          max3=max2;
          max2=cost[j][i];
          c_id_no3=c_id_no2;
          c_id_no2=j;
        }else if(cost[j][i]<max2 && cost[j][i]>max3){
          max3=cost[j][i];
          c_id_no3=j;
        }
      }
      l_priority[l_id] =  [lidar[l_id], camera[c_id_no1],camera[c_id_no2],camera[c_id_no3]];
    }
  }
  // console.log(l_priority);

  // matching処理
  for(let i= 0;i<c_priority.length;i++){
    match[i]=[c_priority[i][0],c_priority[i][1]];
  }
  // console.log(match)
  // matchingの際に複数のカメラ検出が一つのライダーにマッチングしたときできるだけ対処、ただ、一つのライダーの検出に複数のカメラの検出が対応づくことはあるので許容も
  for(let i=0;i<match.length;i++){
    if(match[i][1]){
      let lidar_id = match[i][1][0];
      let camera_id1=match[i][0];
      var camera_priority1 = c_priority[i];
      // 面積がある値以下ならマッチングの際に間違っている可能性があるので修正
      // console.log(match[i][1]);
      if(match[i][1][1]<300000){ ////////////////////////////////////////////////////////
        for(let j=0;j<match.length;j++){
          if(match[j][1]){
            if(i!=j && match[j][1][0]==lidar_id){
              let camera_id2=match[j][0];
              var camera_priority2 = c_priority[j];
              for(let k=0;k<lidar.length;k++){
                if(lidar[k][0]==lidar_id){
                  //l_priorityを参照し、優先順位順にカメラとのマッチングを決定（）
                  for(let l=0;l<l_priority[k].length;l++){
                    // camera_id1の方が優先順位が高い場合、camera_id2のmatchingを変更
                    if(l_priority[k][l]==camera_id1){
                      if(camera_priority2[2]){match[j][1] = camera_priority2[2]}
                      break;
                    }
                    // camera_id1の方が優先順位が高い場合、camera_id2のmatchingを変更
                    if(l_priority[k][l]==camera_id2){
                      if(camera_priority1[2]){match[i][1] = camera_priority1[2]}
                      break;
                    }
                  }
                  break; //　ここはいらないかも
                }
              }
            }
          }
        }
      }else{

      }
    }
  }
  // console.log(match);

  // matchからnew_detectionを出力
  var new_detection = [];
  for(let i=0;i<match.length;i++){
    // matchを参照し、カメラだけで検出したオブジェクト、カメラとライダーで検出したオブジェクト(matchしたやつ)をnew_detectionに保存
    var position;
    // カメラとライダーで検出したオブジェクト
    if(match[i][1]){
      // LiDARが複数人を一人として検出している可能性がある場合
      if(match[i][1][1]>300000){
        let c_id = match[i][0];
        for(let j=0; j<json_c.data.length;j++){
          // console.log(json_c.data[j][0]);
          if(json_c.data[j][0][2]==c_id){
            // position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
            position ={
              x: json_c.data[j][0][0],
              y: json_c.data[j][0][1],
              info:"camera",
              camera_id:c_id,
              lidar_id:match[i][1][0],
              naigai:true
            }
            // console.log(position);
          }
        }
      }
      // 正常にマッチングされたカメラとLiDARの処理
      else{
        let l_id = match[i][1][0];
        for(let j=0;j<json_d.objects.length;j++){
          if(json_d.objects[j].id==l_id){
            position ={
              x:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.x,
              y:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.y,
              info:"multimodal",
              camera_id:match[i][0],
              lidar_id:l_id,
              naigai:false
            }
            position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon)
          }
        }
      }
      // console.log(match[i][1]);
     
    }
    // カメラだけで検出したオブジェクト
    else{
      // console.log(match[i][1]);
      let c_id = match[i][0];
      // console.log("only_camera_detect", c_id);
      for(let j=0; j<json_c.data.length;j++){
        // console.log(json_c.data[j][0]);
        if(json_c.data[j][0][2]==c_id){
          // position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
          position ={
            x: json_c.data[j][0][0],
            y: json_c.data[j][0][1],
            info:"camera",
            camera_id:c_id,
            lidar_id:null,
            naigai:true
          }
          // console.log(position);
        }
        
      }
    }

    new_detection.push(position);
  }
  // console.log(new_detection);

  // lidarのみで検出しているオブジェクトもnew_detectionに格納

  loop:for(let i=0;i<json_d.objects.length;i++){
    let l_id = json_d.objects[i].id;
    var position;
    for(let j=0;j<match.length;j++){
      if(match[j][1]){
        if(match[j][1][0]==l_id){
          continue loop;
        }
      }
    }
    if(json_d.objects[i].type.current!="statics" ){
      position={
        x: json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x,
        y:  json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,
        info:"lidar",
        camera_id:null,
        lidar_id:l_id,
        naigai:false
      }
      position.naigai=isPointInPolygon(position.x,position.y,camera_3_polygon);
      if(position.naigai){

      }else{
        position.naigai=isPointInPolygon(position.x,position.y,camera_2_polygon);
        // if(position.naigai){console.log(position)}
      }
      // position=[json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x, json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,1]
      new_detection.push(position);
    }
  }
  // console.log(json_d.objects[0]);

  // display_fusion_data(new_detection)
  // return new_detection

  track_detection_match(new_detection)
}

class HungarianAlgorithm {
  constructor(costMatrix) {
      this.originalRows = costMatrix.length;
      this.originalCols = costMatrix[0].length;
      this.n = Math.max(this.originalRows, this.originalCols);
      this.costMatrix = this.padMatrix(costMatrix, this.n);
      this.u = Array(this.n).fill(0);
      this.v = Array(this.n).fill(0);
      this.p = Array(this.n).fill(-1);
      this.way = Array(this.n).fill(-1);
  }

  padMatrix(matrix, size) {
      const paddedMatrix = Array.from({ length: size }, (_, i) => {
          return Array.from({ length: size }, (_, j) => {
              if (i < matrix.length && j < matrix[0].length) {
                  return matrix[i][j];
              } else {
                  return Infinity; // 非常に大きな値でパディング
              }
          });
      });
      return paddedMatrix;
  }

  findMatching() {
      for (let i = 0; i < this.n; i++) {
          let links = Array(this.n).fill(-1);
          let mins = Array(this.n).fill(Infinity);
          let visited = Array(this.n).fill(false);
          let markedI = i, markedJ = -1, j;
          while (markedI != -1) {
              j = -1;
              for (let j1 = 0; j1 < this.n; j1++) {
                  if (!visited[j1]) {
                      let cur = this.costMatrix[markedI][j1] - this.u[markedI] - this.v[j1];
                      if (cur < mins[j1]) {
                          mins[j1] = cur;
                          links[j1] = markedJ;
                      }
                      if (j == -1 || mins[j1] < mins[j]) {
                          j = j1;
                      }
                  }
              }
              let delta = mins[j];
              for (let j1 = 0; j1 < this.n; j1++) {
                  if (visited[j1]) {
                      this.u[this.p[j1]] += delta;
                      this.v[j1] -= delta;
                  } else {
                      mins[j1] -= delta;
                  }
              }
              this.u[i] += delta;
              visited[j] = true;
              markedJ = j;
              markedI = this.p[j];
          }
          while (links[j] != -1) {
              this.p[j] = this.p[links[j]];
              j = links[j];
          }
          this.p[j] = i;
      }

      let result = Array(this.originalRows).fill(-1);
      for (let j = 0; j < this.originalCols; j++) {
          if (this.p[j] != -1 && this.p[j] < this.originalRows) {
              result[this.p[j]] = j;
          }
      }
      return result;
  }
}

function integration_v2(json_c, json_d){
  cost=[] // カメラとLiDAR検出のマッチングのためのコスト関数のリセット（カメラの検出数）*（LiDARの検出数）
  camera = []
  lidar = []
  let cam_det_num = 0
  // lidarのhiddenもjson_d.objectsに入れる
  for(let i=0;i<json_d.hiddens.length;i++){
    json_d.objects.push(json_d.hiddens[i]);
  }

  for(let i=0; i<json_c.existing_id.length;i++){
    camera.push(json_c.existing_id[i]);
  }
  for(let i=0;i<json_d.objects.length;i++){
    lidar.push([json_d.objects[i].id, json_d.objects[i].cluster.bbox.area, json_d.objects[i].type])
  }
  
  // console.log(camera)
  // console.log(lidar)

  // コストを計算していく
  for(let i=0; i<json_c.data.length;i++){
    var camera_position = json_c.data[i] // カメラで検出したオブジェクトの位置
    cost.push(new Array(json_d.objects.length));
    // console.log(camera_position)
    for(let k=0;k<json_d.objects.length;k++){
      // console.log(json_d.objects[k].type);
      if(json_d.objects[k].type.current){
        var lidar_position = json_d.objects[k].history;
        // var data_distance = Math.sqrt( Math.pow(camera_position[0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));

        var data_distance;
        // 軌跡を用いてカメラとLiDARのマッチングを行う。まずは軌跡の距離を見てコストを計算
        if(camera_position.length>2 && lidar_position.log.length>4){
          data_distance = (Math.sqrt( Math.pow(camera_position[camera_position.length-1][0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[camera_position.length-1][1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ))
                          + Math.sqrt( Math.pow(camera_position[camera_position.length-3][0] - lidar_position.log[lidar_position.log.length-5].location.x, 2 ) + Math.pow( camera_position[camera_position.length-3][1] - lidar_position.log[lidar_position.log.length-5].location.y, 2 )))/2;
        }else{
          data_distance = Math.sqrt( Math.pow(camera_position[camera_position.length-1][0] - lidar_position.log[lidar_position.log.length-1].location.x, 2 ) + Math.pow( camera_position[camera_position.length-1][1] - lidar_position.log[lidar_position.log.length-1].location.y, 2 ));
        }
        // console.log(data_distance);
        // if(data_distance<4000){console.log(data_distance)} 
        cost[cam_det_num][k] = data_distance;
      }else{
        cost[cam_det_num][k] = Infinity
      }
    }
    cam_det_num++; 
  }
  // if(cost[0]){console.log(cost[0]);}

  // costを元にGala-Shapleyアルゴリズムを適用
  // priorityにカメラ、ライダーのマッチングしたい対象を保存
  // matchに対応付けしたカメラとlidarのidを保存

  var match=[];
  var result;
  var matched_camera = Array(json_c.data.length).fill(0);
  if(cost[0]){
    const hungarian = new HungarianAlgorithm(cost);
    result = hungarian.findMatching();

    // console.log("マッチング結果: ", result);

    //　resultを見てどの検出情報がマッチングしているかを確認
    for(let i=0;i<result.length;i++){
      if(result[i]!=-1){match_new_detection[result[i]]=1;}// tracksとマッチしたnew_detectionは状態１に
    }
    // console.log(match_new_detection)

    // 動的閾値によるフィルタリング
    for(let i=0;i<tracks.length;i++){
      // まず速度を元に動的閾値を決定
      // var threshold_a = Math.sqrt( Math.pow(tracks[i].velocity.vx, 2) + Math.pow(tracks[i].velocity.vy, 2 ));
      // console.log(threshold_a);
      let threshold = 4000;
      // if(tracks[i].velocity.vx==0){
      //   threshold = 2000;
      // }else{
      //   threshold = (Math.sqrt( Math.pow(tracks[i].velocity.vx, 2) + Math.pow(tracks[i].velocity.vy, 2 )))*10;
      //   if(threshold>2000){
      //     threshold = 2000;
      //   }
        // console.log("閾値",threshold);
        // console.log("速度",tracks[i].velocity.vx);
      // }
      

      //閾値以上のコストを持つマッチはマッチではないとする
      for(let j=0;j<match_new_detection.length;j++){
        if(result[i]==j){
          if(cost_matrix[i][j]>threshold){
            match_new_detection[j]=0;
            match_tracks[i]=0;
            // console.log("missmatch", cost_matrix[i][j])
          }else if(isNaN(cost_matrix[i][j])){
            match_new_detection[j]=0;
            match_tracks[i]=0;
          }else{
            match_tracks[i]=1;
            // console.log(cost_matrix[i][j])
          }
        }
      }

    }
    // console.log(match_new_detection)
  }

  // l_priorityも決定
  if(cost[0]){
    for(let i=0;i<cost[0].length;i++){
      let l_id;
      let c_id_no1=-1;
      let c_id_no2=-1;
      let c_id_no3=-1;
      let max1=0;
      let max2=0;
      let max3=0;
      l_id=i;
      for(let j=0;j<cost.length;j++){
        if(cost[j][i]>max1){
          max3=max2;
          max2=max1;
          max1=cost[j][i];
          c_id_no3=c_id_no2;
          c_id_no2=c_id_no1;
          c_id_no1=j;
        }else if(cost[j][i]<max1 && cost[j][i]>max2){
          max3=max2;
          max2=cost[j][i];
          c_id_no3=c_id_no2;
          c_id_no2=j;
        }else if(cost[j][i]<max2 && cost[j][i]>max3){
          max3=cost[j][i];
          c_id_no3=j;
        }
      }
      l_priority[l_id] =  [lidar[l_id], camera[c_id_no1],camera[c_id_no2],camera[c_id_no3]];
    }
  }
  // console.log(l_priority);

  // matching処理
  for(let i= 0;i<c_priority.length;i++){
    match[i]=[c_priority[i][0],c_priority[i][1]];
  }
  // console.log(match)
  // matchingの際に複数のカメラ検出が一つのライダーにマッチングしたときできるだけ対処、ただ、一つのライダーの検出に複数のカメラの検出が対応づくことはあるので許容も
  for(let i=0;i<match.length;i++){
    if(match[i][1]){
      let lidar_id = match[i][1][0];
      let camera_id1=match[i][0];
      var camera_priority1 = c_priority[i];
      // 面積がある値以下ならマッチングの際に間違っている可能性があるので修正
      // console.log(match[i][1]);
      if(match[i][1][1]<300000){ ////////////////////////////////////////////////////////
        for(let j=0;j<match.length;j++){
          if(match[j][1]){
            if(i!=j && match[j][1][0]==lidar_id){
              let camera_id2=match[j][0];
              var camera_priority2 = c_priority[j];
              for(let k=0;k<lidar.length;k++){
                if(lidar[k][0]==lidar_id){
                  //l_priorityを参照し、優先順位順にカメラとのマッチングを決定（）
                  for(let l=0;l<l_priority[k].length;l++){
                    // camera_id1の方が優先順位が高い場合、camera_id2のmatchingを変更
                    if(l_priority[k][l]==camera_id1){
                      if(camera_priority2[2]){match[j][1] = camera_priority2[2]}
                      break;
                    }
                    // camera_id1の方が優先順位が高い場合、camera_id2のmatchingを変更
                    if(l_priority[k][l]==camera_id2){
                      if(camera_priority1[2]){match[i][1] = camera_priority1[2]}
                      break;
                    }
                  }
                  break; //　ここはいらないかも
                }
              }
            }
          }
        }
      }else{

      }
    }
  }
  // console.log(match);

  // matchからnew_detectionを出力
  var new_detection = [];
  for(let i=0;i<match.length;i++){
    // matchを参照し、カメラだけで検出したオブジェクト、カメラとライダーで検出したオブジェクト(matchしたやつ)をnew_detectionに保存
    var position;
    // カメラとライダーで検出したオブジェクト
    if(match[i][1]){
      // LiDARが複数人を一人として検出している可能性がある場合
      if(match[i][1][1]>300000){
        let c_id = match[i][0];
        for(let j=0; j<json_c.data.length;j++){
          // console.log(json_c.data[j][0]);
          if(json_c.data[j][0][2]==c_id){
            // position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
            position ={
              x: json_c.data[j][0][0],
              y: json_c.data[j][0][1],
              info:"camera",
              camera_id:c_id,
              lidar_id:match[i][1][0]
            }
            // console.log(position);
          }
        }
      }
      // 正常にマッチングされたカメラとLiDARの処理
      else{
        let l_id = match[i][1][0];
        for(let j=0;j<json_d.objects.length;j++){
          if(json_d.objects[j].id==l_id){
            position ={
              x:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.x,
              y:json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.y,
              info:"multimodal",
              camera_id:match[i][0],
              lidar_id:l_id
            }
            // position = [json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.x, json_d.objects[j].history.log[json_d.objects[j].history.log.length-1].location.y,0];
          }
        }
      }
      // console.log(match[i][1]);
     
    }
    // カメラだけで検出したオブジェクト
    else{
      // console.log(match[i][1]);
      let c_id = match[i][0];
      // console.log("only_camera_detect", c_id);
      for(let j=0; j<json_c.data.length;j++){
        // console.log(json_c.data[j][0]);
        if(json_c.data[j][0][2]==c_id){
          position = [json_c.data[j][0][0], json_c.data[j][0][1],2];
          position ={
            x: json_c.data[j][0][0],
            y: json_c.data[j][0][1],
            info:"camera",
            camera_id:c_id,
            lidar_id:null
          }
          // console.log(position);
        }
        
      }
    }

    new_detection.push(position);
  }
  // console.log(new_detection);

  // lidarのみで検出しているオブジェクトもnew_detectionに格納

  loop:for(let i=0;i<json_d.objects.length;i++){
    let l_id = json_d.objects[i].id;
    var position;
    for(let j=0;j<match.length;j++){
      if(match[j][1]){
        if(match[j][1][0]==l_id){
          continue loop;
        }
      }
    }
    if(json_d.objects[i].type.current!="statics" ){
      position={
        x: json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x,
        y:  json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,
        info:"lidar",
        camera_id:null,
        lidar_id:l_id
      }
      // position=[json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.x, json_d.objects[i].history.log[json_d.objects[i].history.log.length-1].location.y,1]
      new_detection.push(position);
    }
  }
  // console.log(json_d.objects[0]);

  // display_fusion_data(new_detection)
  // return new_detection

  track_detection_match(new_detection)
}

var tracks=[] // json形式で一つ一つ格納{life:3, history:{log:[{location:{x: ,y: }, time}]}, trust:num, cluster:形状情報, sensor:どのセンサーで捉えているか, predict:{predict_x: ,predict_y: }, velocity:{vx: ,vy: }}
var new_tracks=[] // 誕生状態のトラックを格納する
let num = 0;

function track_detection_match(new_detection){
  var fps_detection = 10
  // matchにnew_detectionの中身がtracksとマッチしたかを格納、マッチしているう場合1そうでない場合0
  var match_new_detection = Array(new_detection.length).fill(0);
  var match_tracks = Array(tracks.length).fill(0);  //////////////////////////fill(1)だったもの
  var new_match_tracks = Array(new_tracks.length).fill(0);
  const cost_matrix = []
  const new_cost_matrix = []


  // 過去トラックの予測値と観測値でマッチングマトリクス構築
  for(let i=0;i<tracks.length;i++){
    // まず速度を元に動的閾値を決定  使わねーーーーー
    // var threshold = Math.sqrt( Math.pow(tracks[i].velocity.vx, 2) + Math.pow(tracks[i].velocity.vy, 2 ));

    // マトリクスの構築
    // 予測位置
    var predict_x=tracks[i].predict.predict_x;
    var predict_y=tracks[i].predict.predict_y;
    cost_matrix.push(new Array(new_detection.length))
    for(let j=0;j<new_detection.length;j++){
      var distance = Math.sqrt( Math.pow(predict_x - new_detection[j].x, 2) + Math.pow(predict_y - new_detection[j].y, 2 ));
      if(isNaN(distance)){
        console.log("だめ");
      }
      var camera_var=1;
      var lidar_var=1;
      if(tracks[i].sensor_id.camera_id == new_detection[j].camera_id){
        camera_var=0.5;
      }
      if(tracks[i].sensor_id.lidar_id == new_detection[j].lidar_id){
        lidar_var = 0.5;
      } 
      // console.log(camera_var, lidar_var)
      cost_matrix[i][j] = distance*lidar_var*camera_var;
    }
  }

  // ハンガリアンアルゴリズム
  // const costMatrix = [
  //   [4, 1, 3],
  //   [2, 0, 5],
  //   [3, 2, 2]
  // ];
  var result;
  let threshold = 2000;
  if(cost_matrix[0]){
    const hungarian = new HungarianAlgorithm(cost_matrix);
    result = hungarian.findMatching();

    // console.log("マッチング結果: ", result);

    //　resultを見てどの検出情報がマッチングしているかを確認
    for(let i=0;i<result.length;i++){
      if(result[i]!=-1){match_new_detection[result[i]]=1;}// tracksとマッチしたnew_detectionは状態１に
    }
    // console.log(match_new_detection)

    // 動的閾値によるフィルタリング
    for(let i=0;i<tracks.length;i++){
      // まず速度を元に動的閾値を決定
      // var threshold_a = Math.sqrt( Math.pow(tracks[i].velocity.vx, 2) + Math.pow(tracks[i].velocity.vy, 2 ));
      // console.log(threshold_a);
      // let threshold = 4000;
      // if(tracks[i].velocity.vx==0){
      //   threshold = 2000;
      // }else{
      //   threshold = (Math.sqrt( Math.pow(tracks[i].velocity.vx, 2) + Math.pow(tracks[i].velocity.vy, 2 )))*10;
      //   if(threshold>2000){
      //     threshold = 2000;
      //   }
        // console.log("閾値",threshold);
        // console.log("速度",tracks[i].velocity.vx);
      // }
      

      //閾値以上のコストを持つマッチはマッチではないとする
      for(let j=0;j<match_new_detection.length;j++){
        if(result[i]==j){
          if(cost_matrix[i][j]>threshold){
            match_new_detection[j]=0;
            match_tracks[i]=0;
            // console.log("missmatch", cost_matrix[i][j])
          }else if(isNaN(cost_matrix[i][j])){
            match_new_detection[j]=0;
            match_tracks[i]=0;
          }else{
            match_tracks[i]=1;
            // console.log(cost_matrix[i][j])
          }
        }
      }

    }
    // console.log(match_new_detection)
  }

  // console.log("new_detection", match_new_detection)
  // console.log("tracks", match_tracks);
  // console.log("tracks.length",tracks.length);


  //トラッキングデータの更新(位置、速度、信頼度、ライフサイクル,trust)
  for(let i= 0;i<match_tracks.length;i++){
    if(match_tracks[i]==1){
      // tracksの更新
      // console.log(new_detection)
      // console.log(result[i])
      if(result[i]!=-1){
        // console.log(result[i]);
        // new_detection[result[i]][0]がない場合は予測値を用いる
        tracks[i].status = "tracking";
        // if(new_detection[result[i]].naigai && new_detection[result[i]].info=="lidar"){
        //   // console.log(new_detection[result[i]],tracks[i]);
        //   if(tracks[i].velocity==0){//new_detection[result[i]].velocity.vx
        //     // tracks[i].trust -= 1;
        //     // console.log(tracks[i]);
        //     // console.log(tracks[i].velocity);
        //     // console.log(Math.abs(tracks[i].velocity.vx));
        //     // console.log(Math.abs(tracks[i].velocity.vx) + Math.abs(tracks[i].velocity.vy));
        //     if(tracks[i].sensor!="lidar"){
        //       console.log(tracks[i]);
        //       console.log(tracks[i].velocity);
        //       console.log(Math.abs(tracks[i].velocity.vx));
        //       console.log(Math.abs(tracks[i].velocity.vx) + Math.abs(tracks[i].velocity.vy));
        //     }
        //   }
          
        // }else{
        //   tracks[i].trust = 15;
        // }
        if(isNaN(new_detection[result[i]].x)){
          console.log(new_detection[result[i]][0]);
          // tracks[i].history.log.push({location:{x: new_detection[result[i]][0], y:new_detection[result[i]][1]}})
          tracks[i].history.log.push({location:{x: tracks[i].predict.predict_x, y: tracks[i].predict.predict_y}});
        }else{
          // console.log(new_detection[result[i]][0]);
          // tracks[i].history.log.push({location:{x: tracks[i].predict.predict_x, y: tracks[i].predict.predict_y}})
          tracks[i].history.log.push({location:{x: new_detection[result[i]].x, y: new_detection[result[i]].y}});
          // console.log(new_detection[result[i]].x);
        }
        // tracks[i].history.log.push({location:{x: new_detection[result[i]][0], y:new_detection[result[i]][1]}})
        if(tracks[i].history.log.length>10){
          tracks[i].history.log.shift();
        }
        // tracksのうちマッチしたものの速度、lifeを更新
        tracks[i].life=30;
        if(tracks[i].history.log.length>1){
          tracks[i].velocity_x = Math.round((tracks[i].history.log[tracks[i].history.log.length-1].location.x-tracks[i].history.log[tracks[i].history.log.length-2].location.x));
          tracks[i].velocity_y = Math.round((tracks[i].history.log[tracks[i].history.log.length-1].location.y-tracks[i].history.log[tracks[i].history.log.length-2].location.y));
          tracks[i].velocity = Math.round(Math.abs(tracks[i].velocity_x) + Math.abs(tracks[i].velocity_y));
          if(new_detection[result[i]].naigai && new_detection[result[i]].info=="lidar" && Math.round(Math.abs(tracks[i].velocity_x) + Math.abs(tracks[i].velocity_y))==0){
            // console.log(tracks[i]);
            // console.log(tracks[i].velocity);
            // console.log(Math.abs(tracks[i].velocity_x));
            // console.log(Math.abs(tracks[i].velocity_x) + Math.abs(tracks[i].velocity_y));
            tracks[i].trust -= 1;
          }else{
            tracks[i].trust =15;
          }
          tracks[i].sensor = new_detection[result[i]].info;
          tracks[i].sensor_id.camera_id=new_detection[result[i]].camera_id;
          tracks[i].sensor_id.lidar_id=new_detection[result[i]].lidar_id;
          // console.log(tracks[i].velocity)

        }else{
          console.log("トラックの長さ不足");
        }
        // if(new_detection[result[i]].naigai && new_detection[result[i]].info=="lidar" && tracks[i].velocity==0){
        //   // console.log(new_detection[result[i]],tracks[i]);
        //   // tracks[i].trust -= 1;
        //   // console.log(tracks[i]);
        //   // console.log(tracks[i].velocity);
        //   // console.log(Math.abs(tracks[i].velocity.vx));
        //   // console.log(Math.abs(tracks[i].velocity.vx) + Math.abs(tracks[i].velocity.vy));

        //   // if(tracks[i].velocity==0){//new_detection[result[i]].velocity.vx
        //   //   tracks[i].trust -= 1;
        //   //   console.log(tracks[i]);
        //   //   console.log(tracks[i].velocity);
        //   //   console.log(Math.abs(tracks[i].velocity.vx));
        //   //   console.log(Math.abs(tracks[i].velocity.vx) + Math.abs(tracks[i].velocity.vy));
        //   //   // if(tracks[i].sensor!="lidar"){
        //   //   //   console.log(tracks[i]);
        //   //   //   console.log(tracks[i].velocity);
        //   //   //   console.log(Math.abs(tracks[i].velocity.vx));
        //   //   //   console.log(Math.abs(tracks[i].velocity.vx) + Math.abs(tracks[i].velocity.vy));
        //   //   // }
        //   // }
        // }else{
        //   tracks[i].trust = 15;
        // }

        // カメラの検出範囲内でライダーだけで検知し、動いていないものは怪しいとする
        // if(tracks[i].history.log[tracks[i].history.log.length-1].location.x)

        // var total_distanse=0;
        
        // //  総移動距離を計算
        // for(let j=1;j<tracks[i].history.log.length;j++){
        //   // total_distanse += Math.abs(tracks[i].history.log[j].location.x-tracks[i].history.log[j-1].location.x);
        //   total_distanse +=  Math.sqrt(Math.pow(tracks[i].history.log[j].location.x-tracks[i].history.log[j-1].location.x, 2) + Math.pow(tracks[i].history.log[j].location.y-tracks[i].history.log[j-1].location.y, 2))
        //   // total_distanse += 
        // }
        // // console.log(total_distanse/(tracks[i].history.log.length-1));

        // var vx = (tracks[i].history.log[tracks[i].history.log.length-1].location.x-tracks[i].history.log[tracks[i].history.log.length-2].location.x)/fps_detection;
        // var vy = (tracks[i].history.log[tracks[i].history.log.length-1].location.y-tracks[i].history.log[tracks[i].history.log.length-2].location.y)/fps_detection;

        // if(vx>=0){
        //   tracks[i].velocity.vx = (total_distanse/(tracks[i].history.log.length-1))/Math.sqrt((vy*vy)/(vx*vx)+1)
        // }else{
        //   tracks[i].velocity.vx = -(total_distanse/(tracks[i].history.log.length-1))/Math.sqrt((vy*vy)/(vx*vx)+1)
        // }
        // // tracks[i].velocity.vx = (total_distanse/(tracks[i].history.log.length-1))/Math.sqrt((vy*vy)/(vx*vx)+1)
        // if(vy>0){
        //   tracks[i].velocity.vy = (total_distanse/(tracks[i].history.log.length-1))/Math.sqrt((vx*vx)/(vy*vy)+1)
        // }else{
        //   tracks[i].velocity.vy = -(total_distanse/(tracks[i].history.log.length-1))/Math.sqrt((vx*vx)/(vy*vy)+1)
        // }
        // tracks[i].velocity.vy = (total_distanse/(tracks[i].history.log.length-1))/Math.sqrt((vx*vx)/(vy*vy)+1)
        // console.log(tracks[i].velocity.vx);
        // console.log(tracks[i].history.log);
        // console.log(total_distanse);///////////////////////////////////////////////////////////////////////////////////////////////////






      }
      
    }else{
      if(isNaN(tracks[i].history.log[tracks[i].history.log.length-1].location.x)){
       // 座標情報がおかしいトラック
      //  console.log(tracks[i].history.log)
      //  console.log()
      }else{
        // tracksのうちマッチしなかったものは速度から次の位置を計算
        var position ={location:{
          x: tracks[i].history.log[tracks[i].history.log.length-1].location.x + tracks[i].velocity_x,
          y: tracks[i].history.log[tracks[i].history.log.length-1].location.y + tracks[i].velocity_y
        }}
        tracks[i].history.log.push(position);
        tracks[i].status = "serching";
        tracks[i].life--;
        // console.log(tracks[i].velocity_x);
        if(tracks[i].history.log.length>20){
          tracks[i].history.log.shift();
        }
      }
    }


    if(tracks[i]){
      tracks[i].life = tracks[i].life - 1;
    }else{
      console.log(tracks[i]);
    }
    // if(result[i]!=-1){
    //   if(new_detection[result[i]].naigai && new_detection[result[i]].info=="lidar"){
    //     if(tracks[i].trust>0 && tracks[i].trust<8){
    //       console.log(tracks[i]);
    //       console.log(i);
    //       console.log(Math.abs(tracks[i].velocity_x));
    //       console.log(Math.abs(tracks[i].velocity_x) + Math.abs(tracks[i].velocity_y));
    //       console.log(tracks[i]);
    //       console.log(i);
    //     }
    //   }
    // }
  }
  

  // トラックの予測値計算
  for(let i=0;i<tracks.length;i++){
    if(tracks[i].history.log.length>0){
      // 過去フレームの最新値
      var pre_x=tracks[i].history.log[tracks[i].history.log.length-1].location.x;
      var pre_y=tracks[i].history.log[tracks[i].history.log.length-1].location.y;
      // 過去フレームと速度を用いて予測値を立てる
      tracks[i].predict.predict_x=pre_x+tracks[i].velocity_x;
      tracks[i].predict.predict_y=pre_y+tracks[i].velocity_y;
    }
    else{
      // historyが空のオブジェクトはないので無視
      console.log(tracks[i]);

    }
  }

  // lifeが0になったtrackから削除していく
  for(let i=0;i<tracks.length;i++){
    if(tracks[i]){
      if(tracks[i].life<1){
        // if(Math.abs(tracks[i].velocity_x) + Math.abs(tracks[i].velocity_y)>10){
        //   // console.log("delete", tracks[i]);
        // }
        // console.log("delete", tracks[i])
        tracks.splice(i,1);
        i--;
      }

    }
  }

  for(let i=0;i<tracks.length;i++){
    if(tracks[i]){
      if(Math.abs(tracks[i].velocity_x)>1000 || Math.abs(tracks[i].velocity_y)>1000){
        tracks.splice(i,1);
        i--;
      }
    }
  }


  // マッチしなかったnew_detectionを新しい軌跡として利用
  // for(let i=0;i<match_new_detection.length;i++){
  //   if(match_new_detection[i]==0){
  //     tracks.push({
  //       id:num,
  //       life:10, 
  //       history:{log:[{location:{x: new_detection[i].x,y:new_detection[i].y}}]}, 
  //       sensor_id:{
  //         camera_id:new_detection[i].camera_id,
  //         lidar_id:new_detection[i].lidar_id,
  //       },
  //       sensor:"fusion", 
  //       predict:{predict_x: new_detection[i].x,predict_y: new_detection[i].y}, 
  //       velocit_x:0,
  //       velocit_y:0,
  //       status:"birth",
  //       trust:1
  //     })
  //     num++;
  //   }
  // }

  // console.log(tracks);


  //　ここからbirth状態のトラッキングを行う


  // new_detectionからマッチングできなかった検出を検出をmatchless_new_detectionに格納
  var matchless_new_detection=[];
  var new_detection_matchless_match = [];
  for(let i=0;i<match_new_detection.length;i++){
    if(match_new_detection[i]==0){
      matchless_new_detection.push(new_detection[i]);
      new_detection_matchless_match.push(i);
    }
  }

  // console.log(new_tracks);
  // for(let i=0;i<new_tracks.length;i++){
  //   if(new_tracks[i]){
  //     if(new_tracks[i].life<1){
  //       new_tracks.splice(i,1);
  //       i--;
  //       console.log("delete");
  //     }
  //   }
  // }

  // 過去のnew_tracksの予測値と観測値でマッチングマトリクス構築
  for(let i=0;i<new_tracks.length;i++){
    // まず速度を元に動的閾値を決定  使わねーーーーー
    // var threshold = Math.sqrt( Math.pow(tracks[i].velocity_x, 2) + Math.pow(tracks[i].velocity_y, 2 ));

    // マトリクスの構築
    // if(new_tracks.life>1){
      // 予測位置
      // var predict_x=new_tracks[i].predict.predict_x;
      // var predict_y=new_tracks[i].predict.predict_y;
      new_cost_matrix.push(new Array(matchless_new_detection.length))
      for(let j=0;j<matchless_new_detection.length;j++){
        var distance = Math.sqrt( Math.pow(new_tracks[i].predict.predict_x - matchless_new_detection[j].x, 2) + Math.pow(new_tracks[i].predict.predict_y - matchless_new_detection[j].y, 2 ));
        new_cost_matrix[i][j] = distance;
      }
    // }
    // console.log(new_cost_matrix);
  }

  var new_result=[];
  if(new_cost_matrix[0]){
    const hungarian = new HungarianAlgorithm(new_cost_matrix);
    new_result = hungarian.findMatching();
    // console.log(matchless_new_detection);
    // console.log(new_tracks);
    // console.log("マッチング結果: ", new_cost_matrix);

    //　new_resultを見てどの検出情報がマッチングしているかを確認
    for(let i=0;i<new_result.length;i++){
      match_new_detection[new_detection_matchless_match[new_result[i]]]=1; // new_tracksとマッチしたnew_detectionは状態１に
    }

    // 動的閾値によるフィルタリング
    for(let i=0;i<new_tracks.length;i++){
      // まず速度を元に動的閾値を決定
      // var threshold_a = Math.sqrt( Math.pow(tracks[i].velocity_x, 2) + Math.pow(tracks[i].velocity_y, 2 ));
      // console.log(threshold_a);
      let threshold = 4000;

      //閾値以上のコストを持つマッチはマッチではないとする
      for(let j=0;j<matchless_new_detection.length;j++){
        if(new_result[i]==j){
          if(new_cost_matrix[i][j]>threshold){
            match_new_detection[new_detection_matchless_match[j]]=0;
            new_match_tracks[i]=0;
          }else{
            new_match_tracks[i]=1;
          }
        }else{
          
        }
      }

    }
  }
  // console.log(new_match_tracks)

  //new_tracksの更新(位置、速度、信頼度、ライフサイクル)
  for(let i= 0;i<new_match_tracks.length;i++){
    if(new_match_tracks[i]=1){
      // tracksの更新
      // console.log(new_detection)
      // console.log(new_result[i])
      // console.log(matchless_new_detection.length)
      if(new_result[i]!=-1){
        // if(matchless_new_detection[new_result[i]].naigai && matchless_new_detection[new_result[i]].info=="lidar"){
        //   // console.log(new_detection[result[i]],tracks[i]);
        //   if(new_tracks[i].velocity==0){//new_detection[result[i]].velocity.vx
        //     new_tracks[i].trust -= 1;
        //     // if(tracks[i].trust>0){
        //     //   console.log(tracks[i]);
        //     //   console.log(tracks[i].velocity);
        //     //   console.log(Math.abs(tracks[i].velocity.vx));
        //     //   console.log(Math.abs(tracks[i].velocity.vx) + Math.abs(tracks[i].velocity.vy));
        //     // }
        //   }
          
        // }else{
        //   new_tracks[i].trust = 15;
        // }
        if(isNaN(matchless_new_detection[new_result[i]].x)){
          // console.log(new_detection[result[i]][0]);
          // tracks[i].history.log.push({location:{x: new_detection[result[i]][0], y:new_detection[result[i]][1]}})
          new_tracks[i].history.log.push({location:{x: new_tracks[i].predict.predict_x, y: new_tracks[i].predict.predict_y}});
          // console.log(new_tracks[i])
        }
        else{
          // tracks[i].history.log.push({location:{x: tracks[i].predict.predict_x, y: tracks[i].predict.predict_y}})
          new_tracks[i].history.log.push({location:{x: matchless_new_detection[new_result[i]].x, y:matchless_new_detection[new_result[i]].y}});
          // console.log(matchless_new_detection[new_result[i]])
        }
        // console.log(matchless_new_detection[new_result[i]])
        // new_tracks[i].history.log.push({location:{x: matchless_new_detection[new_result[i]][0], y:matchless_new_detection[new_result[i]][1]}})
        if(new_tracks[i].history.log.length>10){
          new_tracks[i].history.log.shift();
        }
        // tracksのうちマッチしたものの速度、life、sensorを更新
        new_tracks[i].life += 2;
        new_tracks[i].velocity_x = (new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.x-new_tracks[i].history.log[new_tracks[i].history.log.length-2].location.x);
        new_tracks[i].velocity_y = (new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.y-new_tracks[i].history.log[new_tracks[i].history.log.length-2].location.y);
        new_tracks[i].velocity = Math.abs(new_tracks[i].velocity_x) + Math.abs(new_tracks[i].velocity_y);
        if(matchless_new_detection[new_result[i]].naigai && matchless_new_detection[new_result[i]].info=="lidar"){
          // console.log(new_detection[result[i]],tracks[i]);
          if(new_tracks[i].velocity==0){//new_detection[result[i]].velocity.vx
            new_tracks[i].trust -= 1;
          }else{
            new_tracks[i].trust = 15;
          }
        }else{
          new_tracks[i].trust = 15;
        }
        new_tracks[i].sensor = matchless_new_detection[new_result[i]].info;
        new_tracks[i].sensor_id.camera_id=matchless_new_detection[new_result[i]].camera_id;
        new_tracks[i].sensor_id.lidar_id=matchless_new_detection[new_result[i]].lidar_id;
      }
    }
    else{
      // tracksのうちマッチしなかったものは速度から次の位置を計算
      new_tracks[i].history.log.push({location:{
        x: new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.x + new_tracks[i].velocity_x,
        y: new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.y + new_tracks[i].velocity_y
      }})
      if(new_tracks[i].history.log.length>15){
        new_tracks[i].history.log.shift();
      }
    }


    if(new_tracks[i]){
      new_tracks[i].life = new_tracks[i].life - 1;
    }else{
      // console.log(tracks[i]);
    }


    // // lifeが0になったtrackから削除していく
    // if(new_tracks[i]){
    //   if(new_tracks[i].life<1){
    //     new_tracks.splice(i,1);
    //     i--;
    //     // console.log("delete")
    //   }
    // }
    // else{
    //   tracks.splice(i,1);
    //     i--;
    //     console.log("tracks undefined")
    // }
  }
  // lifeが0になったtrackから削除していく
  for(let i=0;i<new_tracks.length;i++){
    if(new_tracks[i]){
      if(new_tracks[i].life<1){
        new_tracks.splice(i,1);
        i--;
        // console.log("delete")
      }
    }
  }

  // new_tracksから予測値を計算
  for(let i=0;i<new_tracks.length;i++){
    if(new_tracks[i].history.log.length>1){
      // 過去フレームの最新値
      var pre_x=new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.x;
      var pre_y=new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.y;
      // 過去フレームと速度を用いて予測値を立てる
      new_tracks[i].predict.predict_x=pre_x+new_tracks[i].velocity_x;
      new_tracks[i].predict.predict_y=pre_y+new_tracks[i].velocity_y;
    }
    // まだ１フレームしか検出していないなら最新値を予測値として利用
    else if(new_tracks[i].history.log.length==1){
      var pre_x=new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.x;
      var pre_y=new_tracks[i].history.log[new_tracks[i].history.log.length-1].location.y;
      new_tracks[i].predict.predict_x=pre_x;
      new_tracks[i].predict.predict_y=pre_y;
    }else{
      // historyが空のオブジェクトはないので無視
    }
  }

  // lifeが4以上になったnew_tracksを、tracksに追加
  for(let i=0;i<new_tracks.length;i++){
    if(new_tracks[i]){
      if(new_tracks[i].life>20){
        tracks.push(new_tracks[i]);
        // console.log(tracks)
        new_tracks.splice(i,1);
        i--;
      }
    }
  }

  // マッチしなかったnew_detectionを新しい軌跡としてnew_tracksに
  for(let i=0;i<match_new_detection.length;i++){
    if(match_new_detection[i]==0){
      new_tracks.push({
        id:num,
        life:3, 
        history:{log:[{location:{x: new_detection[i].x,y:new_detection[i].y}}]}, 
        sensor_id:{
          camera_id:match_new_detection[i].camera_id,
          lidar_id:match_new_detection[i].lidar_id,
        },
        sensor:match_new_detection[i].info, 
        predict:{predict_x: match_new_detection[i].x,predict_y: match_new_detection[i].y}, 
        velocity_x:0,
        velocity_y:0,
        velocity:0,
        status:"birth",
        trust:30
      })
      num++;
    }
  }

  // for(let i=0;i<tracks.length;i++){
  //   const naigai = isPointInPolygon(tracks[i].history.log[tracks[i].history.log.length-1].location.x, tracks[i].history.log[tracks[i].history.log.length-1].location.y, camera_3_polygon)
  //   if(naigai){
  //     console.log("カメラ３の範囲内", tracks[i].history.log)
  //   }
  // }
  // console.log(tracks);

  display_accumulated_fusion_data(tracks);
}

// 点が多角形内にあるかどうかを判定する関数
function isPointInPolygon(x, y, polygon) {
  let isInside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > y) != (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }

  return isInside;
}

const camera_2_polygon = [
  { x: 28880, y: 10707 },
  { x: 28880, y: 16660 },
  { x: 48080, y: 16660 },
  { x: 48080, y: 10707 }
];

const camera_3_polygon = [
  { x: 56080, y: 10707 },
  { x: 51700, y: 12069 },
  { x: 51700, y: 16660 },
  { x: 52180, y: 18360 },
  { x: 52180, y: 28932 },
  { x: 70480, y: 28932 },
  { x: 70480, y: 16425 },
  { x: 74046, y: 13566 },
  { x: 70480, y: 10707 }
];


// var data_2d_3d_fused = []; //カメラとLiDARで検出されたデータ
// var data_2d_only = []; //カメラのみで検出したデータ
// var data_3d_only = []; //LiDARのみで検出したデータ
// var lidar_corresponded_id = [];



function to_date_c (det_time){
  
  var year = det_time.year;
  var mon  = det_time.mon;
  var day  = det_time.day;
  var hour = det_time.hour;
  var min  = det_time.min;
  var sec  = det_time.sec;
  var mil  = det_time.misec / 1000;

  var t_result = new Date(year, mon-1, day, hour, min, sec, mil);
  // var t_result = new Date(year, mon-1, day, hour, min, sec);
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
  console.log('reload');
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

