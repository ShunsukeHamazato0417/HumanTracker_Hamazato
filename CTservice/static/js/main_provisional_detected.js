'use strict';
if (!window.Worker){
  console.log("You cannot use WebWorker in this browser.");
  console.log("Please use browser that supported WebWorker.")
  //exit 
}


import * as PIXI from 'pixi.js';
import { Graphics } from 'pixi.js';


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
// app_w  = window_w * (app_info_ratio[0]/(app_info_ratio[0]+app_info_ratio[1]));
// info_h = window_h;
// app_h  = window_h;
// if (app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]) > app_h){
//   app_w = app_h * (app_aspect_ratio[0]/app_aspect_ratio[1]);
// } else {
//   app_h = app_w * (app_aspect_ratio[1]/app_aspect_ratio[0]);
// }
// info_w = window_w - app_w;
// if (info_w<540){info_w = 540;}
app_w = window_w;
app_h  = window_h * (app_info_ratio[0]/(app_info_ratio[0]+app_info_ratio[1]));
info_w = window_w;
info_h = window_h * (app_info_ratio[1]/(app_info_ratio[0]+app_info_ratio[1]));

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
  .beginFill(0xffffff)
  .drawRect(0, 0, app_w, app_h)
  .endFill()
app.stage.addChild(bg);
let texture = PIXI.Texture.from('../../../media/new_floor_map20230516.png');
let bg_img = new PIXI.Sprite(texture);
bg_img.alpha = 1.0
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
const worker = new Worker(new URL('./worker_provisional_detected.js', import.meta.url));
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
  console.log(msg.data);
  display_data(msg.data);
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
var line_size = 80;
var grid_w = 2000;
var grid_h = 2000;

var static_objects = new PIXI.Container();
app.stage.addChild(static_objects);
var update_objects = new PIXI.Container();
app.stage.addChild(update_objects);

var center = new PIXI.Graphics();
var bbox = new PIXI.Graphics();
var shape = new PIXI.Graphics();
var reg_line = new PIXI.Graphics();
var history = new PIXI.Graphics();
var velocity = new PIXI.Graphics();

function display_data(json){
  console.log(json)

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
