var $ = require('jquery');

$.expr[':'].textEquals = $.expr.createPseudo(function(arg) {
  return function(elem) {
    return elem.textContent === arg;
  };
});

var MapViewer = function(app, container) {
  var self = this;

  this.maxCellSize = 15;
  this.minCellSize = 8;
  this.cellSize = 0;
  this.cols = 0;

  this.app = app;
  this.canvas = $(container).get(0);
  this.canvasWidth = $(this.canvas).width();
  this.context = null;
  this.colors = [];
  this.globals = [];
  this.canvases = [];
  this.legend = [];

  this.legendBlock = $('.mapWrapper .mapLegend');

  this.init();
  return this;
};

MapViewer.prototype.init = function() {
  var self = this;

  this.context = this.canvas.getContext('2d');

  $(this.canvas).on('mouseout', function(event) {
    self.app.blockInfo.empty();
  });

  const findGLobal = (x, y) => {
    for (let globalName in self.canvases) {
      if (self.canvases.hasOwnProperty(globalName)) {
        let canvas = self.canvases[globalName];
        let context = canvas.getContext('2d');
        let p = context.getImageData(x - 1, y - 1, 2, 2).data.reduce((t, n) => t + n, 0);

        if (p > 0) {
          return globalName;
        }
      }
    }
    return '';
  };

  $(this.canvas).on('mousemove', function(event) {
    var x = event.offsetX;
    var y = event.offsetY;

    var canvasWidth = $(self.canvas).width();
    var cellSize = canvasWidth / self.cols;
    var block = (Math.ceil(y / cellSize) - 1) * self.cols + Math.ceil(x / cellSize);
    var globalName = findGLobal(x, y);

    self.app.blockInfo.text(`Block # ${block} - ${globalName}`);
  });

  const highlightGlobal = globalName => {
    $('ul.mapLegend>li.Active').removeClass('Active');
    $('#map canvas.Active').removeClass('Active');
    $(`ul.mapLegend>li:textEquals('${globalName}')`).addClass('Active');
    var canvas = self.canvases[globalName];
    if (canvas) {
      $(canvas).addClass('Active');
    }
  };

  $('ul.mapLegend').on('click', function(event) {
    var target = $(event.target).closest('ul.mapLegend>li');
    if (target.length === 1) {
      var globalName = target.text();
      highlightGlobal(globalName);
    }
  });

  $('#map .mask+canvas').on('click', function() {
    if ($('#map canvas.Active').length > 0) {
      $('#map canvas.Active').removeClass('Active');
      $('ul.mapLegend>li.Active').removeClass('Active');
      return;
    }

    let x = event.offsetX;
    let y = event.offsetY;
    let globalName = findGLobal(x, y);
    if (globalName !== '') {
      highlightGlobal(globalName);
    }
  });

  this.initWS();
};

MapViewer.prototype.initWS = function() {
  var self = this;

  self.app.ws.bind('blocks_map', function(data) {
    self.loadMap(data);
  });
};

MapViewer.prototype.loadMap = function(data) {
  var self = this;
  try {
    var cols = this.canvas.width / this.cellSize;
    $.each(data, function(i, glob) {
      var globalName = '^' + glob.global;
      var legend = self.legend[globalName];
      if (!legend) {
        return;
      }
      var colors = self.colors[globalName] || [255, 255, 255];
      if (!colors) {
        return;
      }
      var count = parseInt(legend.attr('data-count')) || 0;
      var globalFill = parseInt(legend.attr('data-fill')) || 0;
      count += glob.blocks.length;
      legend.attr('data-count', count);
      legend.css('order', count);
      var canvas = self.canvases[globalName] || self.canvas;
      var context = canvas.getContext('2d');
      $.each(glob.blocks, function(j, blockInfo) {
        var block = blockInfo[0];
        globalFill += parseInt(blockInfo[1]);
        var fill = Math.max(Math.ceil(parseInt(blockInfo[1]) / 10), 2) / 10;
        var x = block % cols;
        x = x === 0 ? cols : x;
        var y = Math.ceil(block / cols);
        context.fillStyle = 'rgba( ' + colors[0] + ', ' + colors[1] + ', ' + colors[2] + ', 0.5)';
        context.fillRect((x - 1) * self.cellSize, (y - 1) * self.cellSize, self.cellSize, self.cellSize);

        context.fillStyle = '#' + rgbToHex(colors[0], colors[1], colors[2]);
        context.fillRect((x - 1) * self.cellSize, (y - 1) * self.cellSize, self.cellSize, self.cellSize * fill);
      });
      globalFill = Math.ceil(globalFill / (glob.blocks.length + 1));
      legend.attr('data-fill', globalFill);
    });
  } catch (ex) {}
};

MapViewer.prototype.reset = function() {
  var self = this;
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.legendBlock.empty();
  this.colors = [];
  this.globals = [];
  this.legend = [];
  for (var globalName in this.canvases) {
    if (this.canvases.hasOwnProperty(globalName)) {
      var canvas = this.canvases[globalName];
      delete self.canvases[globalName];
      $(canvas).remove();
    }
  }
};

MapViewer.prototype.get = function(directory, blocks) {
  var self = this;
  this.reset();
  this.app.load(
    'rest/block/3',
    {
      directory: directory
    },
    function(blockData) {
      self.initCanvas(blocks);
      self.initColors(blockData.nodes);
      self.app.ws.send('blocks_map', {
        directory: directory
      });
    }
  );
};

MapViewer.prototype.initCanvas = function(blocks) {
  this.canvasWidth = $(this.canvas).width();
  var canvasHeight = (this.canvasWidth / 4) * 3;
  this.cellSize = Math.floor(Math.sqrt((this.canvasWidth * canvasHeight) / blocks));
  this.cellSize = this.cellSize > this.maxCellSize ? this.maxCellSize : this.cellSize;
  this.cellSize = this.cellSize < this.minCellSize ? this.minCellSize : this.cellSize;
  this.cols = Math.ceil(this.canvasWidth / this.cellSize);
  var rows = Math.ceil(blocks / this.cols);
  var width = this.cols * this.cellSize;
  var height = rows * this.cellSize;

  this.canvas.width = width;
  this.canvas.height = height;
  $('#map .mask')
    .width(width)
    .height(height);

  for (var x = 0; x <= width; x += this.cellSize) {
    this.context.moveTo(x, 0);
    this.context.lineTo(x, height);
  }

  for (var x = 0; x <= height; x += this.cellSize) {
    this.context.moveTo(0, x);
    this.context.lineTo(width, x);
  }

  this.context.strokeStyle = 'rgba(222, 222, 222, 255)';
  this.context.stroke();
};

MapViewer.prototype.initColors = function(globals) {
  var self = this;
  var maxCount = globals.length;
  $.each(globals, function(i, node) {
    var ksi = i / maxCount;
    var c_red, c_blue, c_green;
    if (ksi < 0.5) {
      c_red = ksi * 2;
      c_blue = (0.5 - ksi) * 2;
    } else {
      c_red = (1.0 - ksi) * 2;
      c_blue = (ksi - 0.5) * 2;
    }

    if (ksi >= 0.3 && ksi < 0.8) {
      c_green = (ksi - 0.3) * 2;
    } else if (ksi < 0.3) {
      c_green = (0.3 - ksi) * 2;
    } else {
      c_green = (1.3 - ksi) * 2;
    }

    c_red = Math.trunc(c_red * 255);
    c_green = Math.trunc(c_green * 255);
    c_blue = Math.trunc(c_blue * 255);
    var globalName = node.print;
    self.colors[globalName] = [c_red, c_green, c_blue];
    self.globals[[c_red, c_green, c_blue]] = globalName;
    self.canvases[globalName] = $('<canvas>')
      .attr('width', self.canvas.width)
      .attr('height', self.canvas.height)
      .prependTo(self.canvas.parentElement)
      .get(0);
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
      .appendTo(self.legendBlock);
  });
};

function rgbToHex(r, g, b) {
  if (r > 255 || g > 255 || b > 255) throw 'Invalid color component';
  return (((r << 16) | (g << 8) | b) + 0x1000000).toString(16).substr(-6);
}

module.exports = MapViewer;
