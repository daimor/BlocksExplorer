var $ = require('jquery');
import {BlocksViewer} from './blocksViewer';
import {FancyWebSocket} from './wsEventDispatcher';
var MapViewer = require('./mapViewer');
require('../css/main.css')

var app
$(function () {
  app = new App()
})
window.app = app;

var App = function () {
  this.databaseSelect = $('#databaseSelect')
  this.viewType = $('#viewType')
  this.database = null
  this.blockInfo = $('#header .blockInfo')

  this.elements = {
    viewType: $('#viewType').get(0),
    blocksViewer: $('#blocksViewer').get(0),
    zoomInBtn: $('#btnZoomIn').get(0),
    zoomOutBtn: $('#btnZoomOut').get(0),
    zoomToFitBtn: $('#btnZoomToFit').get(0),
    downloadSVGBtn: $('#btnDownloadSVG').get(0),
    downloadPNGBtn: $('#btnDownloadPNG').get(0),
    mapViewer: $('#map canvas').get(0)
  }

  var wsUrl = ((window.location.protocol == "https:") ? "wss:" : "ws:" + "//" + window.location.host)
  wsUrl += window.location.pathname + 'websocket'
  this.ws = new FancyWebSocket(wsUrl)

  this.ws.bind('error', function (data) {
    console.log(data)
  })

  this.blocksViewer = new BlocksViewer(this, this.elements.blocksViewer)

  this.mapViewer = new MapViewer(this, this.elements.mapViewer)

  this.init()

  return this
}

App.prototype.checkWSState = function () {
  var self = this


  setTimeout(function () {
    self.checkWSState()
  }, 1000)
}

App.prototype.load = function (url, data, callback) {
  var self = this

  $.ajax({
    url: url,
    type: data ? 'POST' : 'GET',
    data: data,
    dataType: 'json',
    complete: function () {

    },
    success: function (data, status) {
      callback.apply(self, [data, status])
    }
  })
}

App.prototype.updateDatabases = function (data) {
  var self = this

  this.databaseSelect.find('option').remove()

  $('<option>')
    .text('Please select database')
    .val('')
    .appendTo(self.databaseSelect)

  $.each(data, function (i, val) {
    $('<option>')
      .val(val.directory)
      .text(val.name)
      .attr('data-blocks', val.blocks)
      .appendTo(self.databaseSelect)
  })

  self.databaseSelect.attr('disabled', false)
}

App.prototype.setDatabase = function (directory, blocks) {
  var self = this

  this.database = directory

  if (this.viewType.is(':checked')) {
    this.mapViewer.reset()
    this.mapViewer.get(directory, blocks)
  } else {
    this.blocksViewer.reset()
    this.blocksViewer.get(3)
  }
  this.saveState()
}

App.prototype.reset = function () {
  this.blocksViewer.reset()
  this.mapViewer.reset()
  this.databaseSelect.find('option:first').attr('selected', true)
  this.database = null
  this.saveState()
  this.blockInfo.empty()
}

App.prototype.saveState = function () {
  var obj = {
    type: this.viewType.is(':checked') ? 'map' : 'tree',
    database: this.database
  }

  sessionStorage.setItem('currentState', JSON.stringify(obj))
}

App.prototype.restoreState = function () {
  var state = (sessionStorage.getItem('currentState') || '')
  var obj

  try {
    obj = JSON.parse(state)
  } catch (e) {
    obj = {}
  }

  this.viewType.attr('checked', (obj.type === 'map')).trigger('change')
  if (obj.database) {
    this.databaseSelect.val(obj.database).trigger('change')
  }

  return obj
}


App.prototype.init = function () {
  var self = this

  this.viewType.on('change', function () {
    self.reset()
  })

  this.databaseSelect.on('change', function (event) {
    var directory = self.databaseSelect.val()
    if (directory !== self.database) {
      if (directory === '') {
        self.reset()
      } else {
        var blocks = $('option:selected', self.databaseSelect).attr('data-blocks')
        self.setDatabase(directory, blocks)
      }
    }
  })

  this.load('rest/dblist', null, function (data) {
    self.updateDatabases(data)
    self.restoreState()
  })
}
