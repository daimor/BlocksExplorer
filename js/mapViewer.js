var MapViewer = function (app, container) {
  var self = this

  this.app = app
  this.canvas = $(container).get(0)
  this.context = null
  this.image = null
  this.colors = []

  this.legendBlock = $('.mapWrapper .mapLegend')

  this.init()
  return this
}

MapViewer.prototype.init = function () {

  this.context = this.canvas.getContext('2d')

  this.initWS()
}

MapViewer.prototype.initWS = function () {
  var self = this
  var wsUrl = ((window.location.protocol == "https:") ? "wss:" : "ws:" + "//" + window.location.host)
  wsUrl += '/blocks/Blocks.WebSocket.cls'
  this.ws = new WebSocket(wsUrl)

  this.ws.onopen = function () {}

  this.ws.onclose = function () {}

  this.ws.onmessage = function () {
    self.wsmessage.apply(self, arguments)
  }
}

function setPixel(imageData, x, y, delta, r, g, b, a) {
  for (var j = y * delta; j < (y + 1) * delta; j++) {
    for (var i = x * delta; i < (x + 1) * delta; i++) {
      var index = (i + j * imageData.width) * 4
      imageData.data[index] = r
      imageData.data[index + 1] = g
      imageData.data[index + 2] = b
      imageData.data[index + 3] = a
    }
  }
  // boarder of dots
  if (delta > 2) {
    i = x * delta
    for (var j = y * delta; j < (y + 1) * delta; j++) {
      var index = (i + j * imageData.width) * 4
      imageData.data[index] = 0
      imageData.data[index + 1] = 0
      imageData.data[index + 2] = 0
      imageData.data[index + 3] = 0
    }
    j = y * delta
    for (var i = x * delta; i < (x + 1) * delta; i++) {
      var index = (i + j * imageData.width) * 4
      imageData.data[index] = 0
      imageData.data[index + 1] = 0
      imageData.data[index + 2] = 0
      imageData.data[index + 3] = 0
    }
  }
}

MapViewer.prototype.wsmessage = function (event) {
  var self = this
  try {
    var data = JSON.parse(event.data)
    var width = this.image.width / 10
    var delta = 10
    $.each(data, function (i, glob) {
      var globalName = '^' + glob.global
      var colors = self.colors[globalName] || null
      if (colors !== null) {
        $.each(glob.blocks, function (j, block) {
          y = Math.trunc(block / width)
          x = block % width
          setPixel(self.image, x, y, delta, colors[0], colors[1], colors[2], 255)
        })
      }
    })
    this.context.putImageData(this.image, 0, 0)
  } catch (ex) {

  }
}

MapViewer.prototype.reset = function () {
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  this.image = null
  this.legendBlock.empty()
}

MapViewer.prototype.get = function (directory, blocks) {
  var self = this
  this.reset()
  this.app.load('rest/block/3', {
    directory: directory
  }, function (blockData) {
    self.initImage(blocks)
    self.initColors(blockData.nodes)
    self.ws.send('getblocks\x01' + directory)
  })
}

MapViewer.prototype.initImage = function (blocks) {
  var edge = Math.ceil(Math.sqrt(blocks)) * 10

  this.image = this.context.createImageData(edge, edge)
  this.canvas.width = edge
  this.canvas.height = edge
}

MapViewer.prototype.initColors = function (globals) {
  var self = this
  var maxCount = globals.length
  $.each(globals, function (i, node) {
    var ksi = i / maxCount
    var c_red, c_blue, c_green
    if (ksi < 0.5) {
      c_red = ksi * 2
      c_blue = (0.5 - ksi) * 2
    } else {
      c_red = (1.0 - ksi) * 2
      c_blue = (ksi - 0.5) * 2
    }

    if (ksi >= 0.3 && ksi < 0.8) {
      c_green = (ksi - 0.3) * 2
    } else if (ksi < 0.3) {
      c_green = (0.3 - ksi) * 2
    } else {
      c_green = (1.3 - ksi) * 2
    }

    c_red = Math.trunc(c_red * 256)
    c_green = Math.trunc(c_green * 256)
    c_blue = Math.trunc(c_blue * 256)
    var globalName = node.print
    self.colors[globalName] = [c_red, c_green, c_blue]
    $('<div>')
      .text(globalName)
      .append(
        $('<span>')
          .css('background-color', 'rgb(' + c_red + ', ' + c_green + ', ' + c_blue + ')')
        )
      .appendTo(self.legendBlock)
  })
}
