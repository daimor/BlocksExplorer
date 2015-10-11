var MapViewer = function (app, container) {
  var self = this

  this.maxCellSize = 10
  this.minCellSize = 5
  this.cellSize = 0

  this.app = app
  this.canvas = $(container).get(0)
  this.context = null
  this.colors = []
  this.globals = []
  this.canvases = []
  this.legend = []

  this.legendBlock = $('.mapWrapper .mapLegend')

  this.init()
  return this
}

MapViewer.prototype.init = function () {
  var self = this

  this.context = this.canvas.getContext('2d')

  $(this.canvas).on('mouseout', function (event) {
    self.app.blockInfo.empty()
  })

  $(this.canvas).on('mousemove', function (event) {
    var x = event.offsetX
    var y = event.offsetY

    var cols = self.canvas.width / self.cellSize
    var block = (Math.ceil(y / self.cellSize) - 1) * cols + Math.ceil(x / self.cellSize)

    self.app.blockInfo.text('Block # ' + block)
  })

  $('ul.mapLegend').on('click', function (event) {
    var target = $(event.target).closest('ul.mapLegend>li')
    if (target.length === 1) {
      $('ul.mapLegend>li.Active').removeClass('Active')
      $(target).addClass('Active')
      $('#map canvas.Active').removeClass('Active')
      var globalName = target.text()
      var canvas = self.canvases[globalName]
      if (canvas) {
        $(canvas).addClass('Active')
      }
    }
  })

  $('#map .mask+canvas').on('click', function () {
    $('#map canvas.Active').removeClass('Active')
    $('ul.mapLegend>li.Active').removeClass('Active')
  })

  this.initWS()
}

MapViewer.prototype.initWS = function () {
  var self = this

  self.app.ws.bind('blocks_map', function (data) {
    self.loadMap(data)
  })
}

MapViewer.prototype.loadMap = function (data) {
  var self = this
  try {
    var cols = this.canvas.width / this.cellSize
    $.each(data, function (i, glob) {
      var globalName = '^' + glob.global
      var legend = self.legend[globalName]
      if (!legend) {
        return
      }
      var colors = self.colors[globalName] || [255, 255, 255]
      if (!colors) {
        return
      }
      var count = parseInt(legend.attr('data-count')) || 0
      var globalFill = parseInt(legend.attr('data-fill')) || 0
      count += glob.blocks.length
      legend.attr('data-count', count)
      legend.css('order', count)
      var canvas = self.canvases[globalName] || self.canvas
      var context = canvas.getContext('2d')
      $.each(glob.blocks, function (j, blockInfo) {
        var block = blockInfo[0]
        globalFill += parseInt(blockInfo[1])
        var fill = Math.max(Math.ceil(parseInt(blockInfo[1]) / 10), 2) / 10
        var x = block % cols
        x = x === 0 ? cols : x
        var y = Math.ceil(block / cols)
        context.fillStyle = 'rgba( ' + colors[0] + ', ' + colors[1] + ', ' + colors[2] + ', 0.5)'
        context.fillRect((x - 1) * self.cellSize, (y - 1) * self.cellSize, self.cellSize, self.cellSize)

        context.fillStyle = '#' + rgbToHex(colors[0], colors[1], colors[2])
        context.fillRect((x - 1) * self.cellSize, (y - 1) * self.cellSize, self.cellSize, self.cellSize * fill)
      })
      globalFill = Math.ceil(globalFill / (glob.blocks.length + 1))
      legend.attr('data-fill', globalFill)
    })
  } catch (ex) {

  }
}

MapViewer.prototype.reset = function () {
  var self = this
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  this.legendBlock.empty()
  this.colors = []
  this.globals = []
  this.legend = []
  for (var globalName in this.canvases) {
    if (this.canvases.hasOwnProperty(globalName)) {
      var canvas = this.canvases[globalName]
      delete self.canvases[globalName]
      $(canvas).remove()
    }
  }
}

MapViewer.prototype.get = function (directory, blocks) {
  var self = this
  this.reset()
  this.app.load('rest/block/3', {
    directory: directory
  }, function (blockData) {
    self.initCanvas(blocks)
    self.initColors(blockData.nodes)
    self.app.ws.send('blocks_map', {
      'directory': directory
    })
  })
}

MapViewer.prototype.initCanvas = function (blocks) {
  var cols = Math.ceil(Math.sqrt(blocks))
  var canvasWidth = $(this.canvas).width()
  if ((canvasWidth / cols) > 20) {
    cols = Math.ceil(canvasWidth / 20)
  } else if ((canvasWidth / cols) < 10) {
    cols = Math.ceil(canvasWidth / 10)
  }
  this.cellSize = Math.ceil(canvasWidth / cols)
  var rows = Math.ceil(blocks / cols)
  var width = cols * this.cellSize
  var height = rows * this.cellSize

  this.canvas.width = width
  this.canvas.height = height
  $('#map .mask').width(width).height(height)

  for (var x = 0; x <= width; x += this.cellSize) {
    this.context.moveTo(x, 0)
    this.context.lineTo(x, height)
  }

  for (var x = 0; x <= height; x += this.cellSize) {
    this.context.moveTo(0, x)
    this.context.lineTo(width, x)
  }

  this.context.strokeStyle = "rgba(222, 222, 222, 255)"
  this.context.stroke()
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

    c_red = Math.trunc(c_red * 255)
    c_green = Math.trunc(c_green * 255)
    c_blue = Math.trunc(c_blue * 255)
    var globalName = node.print
    self.colors[globalName] = [c_red, c_green, c_blue]
    self.globals[[c_red, c_green, c_blue]] = globalName
    self.canvases[globalName] = $('<canvas>')
      .attr('width', self.canvas.width)
      .attr('height', self.canvas.height)
      .prependTo(self.canvas.parentElement).get(0)
      // var context = self.canvases[globalName].getContext('2d')
      // context.fillStyle = '#' + rgbToHex(c_red, c_green, c_blue)
    self.legend[globalName] = $('<li>')
      .text(globalName)
      .attr('data-count', 0)
      .attr('data-fill', 0)
      .prepend(
        $('<span>')
        .addClass('legend')
        .css('background-color', '#' + rgbToHex(c_red, c_green, c_blue))
      )
      .appendTo(self.legendBlock)
  })
}

function rgbToHex(r, g, b) {
  if (r > 255 || g > 255 || b > 255)
    throw "Invalid color component"
  return (((r << 16) | (g << 8) | b) + 0x1000000).toString(16).substr(-6)
}
