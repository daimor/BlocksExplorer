'use strict';
var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

const db_host = process.env['DB_HOST'] || 'localhost';
const db_port = process.env['DB_PORT'] || 57772;

module.exports = {
  mode: 'development',
  entry: './js/main.js',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].bundle.js',
    sourceMapFilename: '[name].map',
    chunkFilename: '[id].chunk.js'
  },
  module: {
    rules: [
      //     {
      //       test: /\.js$/,
      //       exclude: /(node_modules|bower_components)/,
      //       loader: 'babel-loader'
      //     },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader' // creates style nodes from JS strings
          },
          {
            loader: 'css-loader' // translates CSS into CommonJS
          },
          {
            loader: 'sass-loader' // compiles Sass to CSS
          }
        ]
      }
      //     {
      //       test: /\.css$/,
      //       use: ExtractTextPlugin.extract({
      //         fallback: 'style-loader',
      //         use: ['css-loader', 'postcss-loader']

      //       })
      //     },
      //     {
      //       test: /\.html$/,
      //       loader: 'html-loader'
      //     },
    ]
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
    // new ExtractTextPlugin({
    //   filename: 'styles.css',
    //   allChunks: true
    // }),
    new HtmlWebpackPlugin({
      template: './index.html',
      chunksSortMode: 'dependency'
    })
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: ['main']
    // }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   minChunks: Infinity,
    //   name: 'inline',
    //   filename: 'inline.js',
    //   sourceMapFilename: 'inline.map'
    // })
  ],
  node: {
    fs: 'empty',
    global: true,
    crypto: 'empty',
    module: false,
    clearImmediate: false,
    setImmediate: false
  },
  devServer: {
    inline: true,
    allowedHosts: ['blocks.localtest.me'],
    proxy: {
      '/rest': {
        target: `http://${db_host}:${db_port}/blocks`
      },
      '/websocket': {
        target: `ws://${db_host}:${db_port}/blocks`,
        changeOrigin: true,
        ws: true
      }
    }
  }
};
