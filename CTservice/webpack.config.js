var path = require("path")
var webpack = require('webpack')
var BundleTracker = require('webpack-bundle-tracker')

module.exports = {
  mode: 'development',

  devtool: "eval-source-map",

  context: __dirname,

  entry: {
      main:    './assets/js/main.js', 
      worker:  './assets/js/worker.js',
      main_integrated:    './assets/js/main_integrated.js', 
      worker_integrated:  './assets/js/worker_integrated.js',
      main_cluster:    './assets/js/main_cluster.js', 
      worker_cluster:  './assets/js/worker_cluster.js',
      main_detected:    './assets/js/main_detected.js', 
      worker_detected:  './assets/js/worker_detected.js',
      main_camera:    './assets/js/main_camera.js', 
      worker_camera:  './assets/js/worker_camera.js',
      main_multimodal:    './assets/js/main_multimodal.js', 
      worker_mulitimodal:   './assets/js/worker_multimodal.js', 
      main_multimodal_new:    './assets/js/main_multimodal_new.js', 
      worker_mulitimodal_new:   './assets/js/worker_multimodal_new.js', 
      main_chistory:    './assets/js/main_chistory.js', 
      worker_chistory:  './assets/js/worker_chistory.js',
      main_history_multimodal:    './assets/js/main_history_multimodal.js', 
      worker_history_multimodal:  './assets/js/worker_history_multimodal.js',
      main_history_multimodal_sub:    './assets/js/main_history_multimodal_sub.js', 
      worker_history_multimodal_sub:  './assets/js/worker_history_multimodal_sub.js',
      main_provisional_detected:    './assets/js/main_provisional_detected.js', 
      worker_provisional_detected:  './assets/js/worker_provisional_detected.js',
      main_provisional_multimodal:    './assets/js/main_provisional_multimodal.js', 
      worker_provisional_multimodal:  './assets/js/worker_provisional_multimodal.js',
      main_mot:    './assets/js/main_mot.js', 
      worker_mot:  './assets/js/worker_mot.js',
  },

  output: {
      path: path.resolve('./assets/bundles/'), // 出力
      filename: "[name]-[hash].js",
  },

  plugins: [
    new BundleTracker({filename: './webpack-stats.json'}),
  ],
}
