import * as Pixi from 'pixi.js'
import './fake_dom.js';

self.addEventListener('message', (messaage) => {
  if(!message.canvas) {
    self.postMessage("normal message recieved.");  
    return;
  }

  self.postMessage("offscreencanvas recieved.");
  const pixi = new Pixi.Application({
    width: message.width,
    height: message.height,
    view: message.canvas
  });
});
