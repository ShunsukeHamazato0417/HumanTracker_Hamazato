/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/js/worker_cluster.js":
/*!*************************************!*\
  !*** ./assets/js/worker_cluster.js ***!
  \*************************************/
/***/ (() => {

eval("\nconsole.log('WebWorker activate.');\n\nlet send_data;\nlet displaying;\nlet displaying_view;\nlet start = false;\nvar ws_req;\nvar now, data_t, lag;\n\n\nlet domain = 'ws://192.168.50.12:';\nlet port = '8081';\nlet ws_server;\nlet ws;\nlet ws_max_reconnect = 10;\nlet ws_try_reconnect = 0;\nlet ws_try_interval  = 0;\nlet interval = 1;\nlet ty;\n\nself.addEventListener('message', (req) => {\n  if (req.data.ty){\n    ty = req.data.ty;\n    ws_req = { \n\t      ty       : ty,\n        interval : interval \n    }\n    ws_server = domain + port;\n    ws_connect();\n  } else if (req.data.command){\n    if (req.data.command=='reconnect'){\n      ws.close();\n    } else if (req.data.command=='Forced reconnect'){\n      interval++;\n      ws_req = { ty : ty,\n                 interval : interval }\n      console.log(interval);\n      ws.close();\n    }\n  }\n});\n\n//console.log(location.href)\n\n/* ----- functions ----- */\nvar pre = new Date();\nvar fps;\n\nfunction ws_connect(){\n  ws = new WebSocket(ws_server);\n \n  ws.onopen = function(){\n    ws_try_reconnect = 0;\n    ws_try_interval  = 0;\n    ws.send(JSON.stringify(ws_req));\n    console.log(ws_req);\n    console.log('Connected to WebSocket server: ' + ws_server);\n  };\n\n  ws.onmessage = function(msg){\n    //console.log(msg.data);\n    var json = JSON.parse(msg.data);\n    console.log(json);\n    self.postMessage(json);\n  };\n\n  ws.onclose = function incoming(event){\n    ws_try_reconnect++;\n    ws_try_interval++;\n    if (ws_try_reconnect <= 1){\n      console.log('Failed connecting to WebSocket server: ' + ws_server);\n    } else if (ws_try_reconnect >= ws_max_reconnect){\n      console.log('WebSocket server is down.');\n      return;\n    }\n    sleep(ws_try_interval);\n    console.log('Try Reconnecting: ' + ws_try_reconnect);\n    //console.log('ws close.event',event);\n    //console.log('ws.readyState',ws.readyState);\n    ws_connect();\n  };\n}\n\n\nfunction sleep(a){\n  var dt1 = new Date().getTime();\n  var dt2 = new Date().getTime();\n  while (dt2 < dt1 + a*1000){\n    dt2 = new Date().getTime();\n  }\n  return;\n}\n\n\nfunction to_date (time){\n  var pattern = new RegExp('([0-9]{4})/([0-9]{2})/([0-9]{2}).([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{3})', 'g');\n  var result = pattern.exec(time);\n  var year = Number(result[1]);\n  var mon  = Number(result[2]);\n  var day  = Number(result[3]);\n  var hour = Number(result[4]);\n  var min  = Number(result[5]);\n  var sec  = Number(result[6]);\n  var mil  = Number(result[7]);\n\n  var t_result = new Date(year, mon-1, day, hour, min, sec, mil);\n  return t_result;\n}\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9hc3NldHMvanMvd29ya2VyX2NsdXN0ZXIuanMuanMiLCJtYXBwaW5ncyI6IkFBQVk7QUFDWjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0EsbUNBQW1DLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7QUFDdkc7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9DVHNlcnZpY2UvLi9hc3NldHMvanMvd29ya2VyX2NsdXN0ZXIuanM/NmMwZiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcbmNvbnNvbGUubG9nKCdXZWJXb3JrZXIgYWN0aXZhdGUuJyk7XG5cbmxldCBzZW5kX2RhdGE7XG5sZXQgZGlzcGxheWluZztcbmxldCBkaXNwbGF5aW5nX3ZpZXc7XG5sZXQgc3RhcnQgPSBmYWxzZTtcbnZhciB3c19yZXE7XG52YXIgbm93LCBkYXRhX3QsIGxhZztcblxuXG5sZXQgZG9tYWluID0gJ3dzOi8vMTkyLjE2OC41MC4xMjonO1xubGV0IHBvcnQgPSAnODA4MSc7XG5sZXQgd3Nfc2VydmVyO1xubGV0IHdzO1xubGV0IHdzX21heF9yZWNvbm5lY3QgPSAxMDtcbmxldCB3c190cnlfcmVjb25uZWN0ID0gMDtcbmxldCB3c190cnlfaW50ZXJ2YWwgID0gMDtcbmxldCBpbnRlcnZhbCA9IDE7XG5sZXQgdHk7XG5cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChyZXEpID0+IHtcbiAgaWYgKHJlcS5kYXRhLnR5KXtcbiAgICB0eSA9IHJlcS5kYXRhLnR5O1xuICAgIHdzX3JlcSA9IHsgXG5cdCAgICAgIHR5ICAgICAgIDogdHksXG4gICAgICAgIGludGVydmFsIDogaW50ZXJ2YWwgXG4gICAgfVxuICAgIHdzX3NlcnZlciA9IGRvbWFpbiArIHBvcnQ7XG4gICAgd3NfY29ubmVjdCgpO1xuICB9IGVsc2UgaWYgKHJlcS5kYXRhLmNvbW1hbmQpe1xuICAgIGlmIChyZXEuZGF0YS5jb21tYW5kPT0ncmVjb25uZWN0Jyl7XG4gICAgICB3cy5jbG9zZSgpO1xuICAgIH0gZWxzZSBpZiAocmVxLmRhdGEuY29tbWFuZD09J0ZvcmNlZCByZWNvbm5lY3QnKXtcbiAgICAgIGludGVydmFsKys7XG4gICAgICB3c19yZXEgPSB7IHR5IDogdHksXG4gICAgICAgICAgICAgICAgIGludGVydmFsIDogaW50ZXJ2YWwgfVxuICAgICAgY29uc29sZS5sb2coaW50ZXJ2YWwpO1xuICAgICAgd3MuY2xvc2UoKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vL2NvbnNvbGUubG9nKGxvY2F0aW9uLmhyZWYpXG5cbi8qIC0tLS0tIGZ1bmN0aW9ucyAtLS0tLSAqL1xudmFyIHByZSA9IG5ldyBEYXRlKCk7XG52YXIgZnBzO1xuXG5mdW5jdGlvbiB3c19jb25uZWN0KCl7XG4gIHdzID0gbmV3IFdlYlNvY2tldCh3c19zZXJ2ZXIpO1xuIFxuICB3cy5vbm9wZW4gPSBmdW5jdGlvbigpe1xuICAgIHdzX3RyeV9yZWNvbm5lY3QgPSAwO1xuICAgIHdzX3RyeV9pbnRlcnZhbCAgPSAwO1xuICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkod3NfcmVxKSk7XG4gICAgY29uc29sZS5sb2cod3NfcmVxKTtcbiAgICBjb25zb2xlLmxvZygnQ29ubmVjdGVkIHRvIFdlYlNvY2tldCBzZXJ2ZXI6ICcgKyB3c19zZXJ2ZXIpO1xuICB9O1xuXG4gIHdzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKG1zZyl7XG4gICAgLy9jb25zb2xlLmxvZyhtc2cuZGF0YSk7XG4gICAgdmFyIGpzb24gPSBKU09OLnBhcnNlKG1zZy5kYXRhKTtcbiAgICBjb25zb2xlLmxvZyhqc29uKTtcbiAgICBzZWxmLnBvc3RNZXNzYWdlKGpzb24pO1xuICB9O1xuXG4gIHdzLm9uY2xvc2UgPSBmdW5jdGlvbiBpbmNvbWluZyhldmVudCl7XG4gICAgd3NfdHJ5X3JlY29ubmVjdCsrO1xuICAgIHdzX3RyeV9pbnRlcnZhbCsrO1xuICAgIGlmICh3c190cnlfcmVjb25uZWN0IDw9IDEpe1xuICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCBjb25uZWN0aW5nIHRvIFdlYlNvY2tldCBzZXJ2ZXI6ICcgKyB3c19zZXJ2ZXIpO1xuICAgIH0gZWxzZSBpZiAod3NfdHJ5X3JlY29ubmVjdCA+PSB3c19tYXhfcmVjb25uZWN0KXtcbiAgICAgIGNvbnNvbGUubG9nKCdXZWJTb2NrZXQgc2VydmVyIGlzIGRvd24uJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNsZWVwKHdzX3RyeV9pbnRlcnZhbCk7XG4gICAgY29uc29sZS5sb2coJ1RyeSBSZWNvbm5lY3Rpbmc6ICcgKyB3c190cnlfcmVjb25uZWN0KTtcbiAgICAvL2NvbnNvbGUubG9nKCd3cyBjbG9zZS5ldmVudCcsZXZlbnQpO1xuICAgIC8vY29uc29sZS5sb2coJ3dzLnJlYWR5U3RhdGUnLHdzLnJlYWR5U3RhdGUpO1xuICAgIHdzX2Nvbm5lY3QoKTtcbiAgfTtcbn1cblxuXG5mdW5jdGlvbiBzbGVlcChhKXtcbiAgdmFyIGR0MSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB2YXIgZHQyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIHdoaWxlIChkdDIgPCBkdDEgKyBhKjEwMDApe1xuICAgIGR0MiA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9XG4gIHJldHVybjtcbn1cblxuXG5mdW5jdGlvbiB0b19kYXRlICh0aW1lKXtcbiAgdmFyIHBhdHRlcm4gPSBuZXcgUmVnRXhwKCcoWzAtOV17NH0pLyhbMC05XXsyfSkvKFswLTldezJ9KS4oWzAtOV17Mn0pOihbMC05XXsyfSk6KFswLTldezJ9KS4oWzAtOV17M30pJywgJ2cnKTtcbiAgdmFyIHJlc3VsdCA9IHBhdHRlcm4uZXhlYyh0aW1lKTtcbiAgdmFyIHllYXIgPSBOdW1iZXIocmVzdWx0WzFdKTtcbiAgdmFyIG1vbiAgPSBOdW1iZXIocmVzdWx0WzJdKTtcbiAgdmFyIGRheSAgPSBOdW1iZXIocmVzdWx0WzNdKTtcbiAgdmFyIGhvdXIgPSBOdW1iZXIocmVzdWx0WzRdKTtcbiAgdmFyIG1pbiAgPSBOdW1iZXIocmVzdWx0WzVdKTtcbiAgdmFyIHNlYyAgPSBOdW1iZXIocmVzdWx0WzZdKTtcbiAgdmFyIG1pbCAgPSBOdW1iZXIocmVzdWx0WzddKTtcblxuICB2YXIgdF9yZXN1bHQgPSBuZXcgRGF0ZSh5ZWFyLCBtb24tMSwgZGF5LCBob3VyLCBtaW4sIHNlYywgbWlsKTtcbiAgcmV0dXJuIHRfcmVzdWx0O1xufVxuXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./assets/js/worker_cluster.js\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./assets/js/worker_cluster.js"]();
/******/ 	
/******/ })()
;