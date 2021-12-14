var path = require("path")
var webpack = require('webpack')
var BundleTracker = require('webpack-bundle-tracker')

module.exports = {
  mode: 'development',

  devtool: "eval-source-map",

  context: __dirname,

  entry: {
      main:    './assets/js/main.js', // エントリ名とエントリポイント
      worker:  './assets/js/worker.js',
  },

  output: {
      path: path.resolve('./assets/bundles/'), // 出力
      filename: "[name]-[hash].js",
  },

  plugins: [
    new BundleTracker({filename: './webpack-stats.json'}),
  ],
}
