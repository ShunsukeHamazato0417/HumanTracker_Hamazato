importScripts('fake_dom.js');
importScripts('../lib/pixi/6.1.1/pixi.min.js');
//importScripts('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.1.1/cjs/pixi.min.js');
importScripts('display_class.js');


self.addEventListener('message', function(e) {
  //console.log(e.data);
  if(!message.canvas) console.log(message);

  const pixi = new PIXI.Application({
    width: message.width,
    height: message.height,
    view: message.canvas
  });
}, false);
