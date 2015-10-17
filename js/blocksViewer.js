var BlocksViewer = function (app, container) {
  this.app = app
  this.container = $(container)
  this.blocks = []
  this.blockData = []
  this.blocksParent = []
  this.blocksLeft = []

  this.ZOOM_DELTA = 0.2
  this.MIN_PAPER_SCALE = 0.2
  this.MAX_PAPER_SCALE = 2
  this.SYMBOL_12_WIDTH = 7

  this.init()
  return this
}

BlocksViewer.prototype.reset = function () {
  this.blocks = []
  this.blockData = []
  this.blocksParent = []
  this.blocksLeft = []

  this.graph.resetCells()
}

BlocksViewer.prototype.get = function (blockId) {
  var self = this

  if (false) {
    self.app.ws.send('blocks_tree', {
      'directory': this.app.database
    })
  } else {
    if (this.blocks[blockId]) {
      var block = this.graph.getCell(this.blocks[blockId])
      block.remove()
    }
    this.app.load('rest/block/' + blockId, {
      directory: this.app.database
    }, function (data) {
      self.add(blockId, data)
    })
  }
}

BlocksViewer.prototype.loadTree = function (data) {
  var self = this

  var addBlock = function (blockId, parentBlock) {
    var parent = (!parentBlock) ? null : self.blocks[parentBlock] || addBlock(parentBlock, null)

    var block = new joint.shapes.basic.Circle({
      attrs: {
        text: {
          text: blockId
        }
      }
    })

    self.blocks[blockId] = block
    self.graph.addCell(block)

    if (parent) {
      var link = new joint.dia.Link({
        source: {
          id: parent.id
        },
        target: {
          id: block.id
        }
      })
      self.graph.addCell(link)
    } else {
      block.position(50, 50)
    }

    return block
  }

  _.each(data, function (parentBlock) {
    _.each(parentBlock.child, function (child) {
      addBlock(child, parentBlock.block)
    })
  })
}

BlocksViewer.prototype.add = function (blockId, blockData) {
  var self = this

  var block = new joint.shapes.blocks.Block({
    position: {
      x: 100,
      y: 200
    },
    blockData: blockData,
    SYMBOL_12_WIDTH: this.SYMBOL_12_WIDTH
  })
  this.blocks[blockId] = block.id
  this.graph.addCell(block)

  var parentBlock = this.blocksParent[blockId]
  if (parentBlock) {
    var link = new joint.shapes.blocks.Link({
      source: {
        id: this.blocks[parentBlock],
        port: 'node' + blockId
      },
      target: {
        id: block.id,
        port: 'up'
      }
    })
    self.graph.addCell(link)
  }

  var leftBlock = this.blocksLeft[blockId]
  if (leftBlock) {
    var link = new joint.shapes.blocks.Link({
      source: {
        id: this.blocks[leftBlock],
        port: 'right'
      },
      target: {
        id: block.id,
        port: 'left'
      }
    })
    self.graph.addCell(link)
  }

  if (blockData.link && blockData.link > 0) {
    self.blocksLeft[blockData.link] = blockId
  }
  _.each(blockData.nodes, function (node, nodeId) {
    var nodeBlockId = node.blockId || 0
    if (nodeBlockId === 0) return

    self.blocksParent[node.blockId] = blockId
  })
}

BlocksViewer.prototype.layout = function (options) {
  var rankSep = 60
  var nodeSep = 40
  var self = this
  options = options || {}

  if (!options.parent) {
    return
  }

  var parentBlock = this.graph.getCell(options.parent)
  var outPorts = parentBlock.get('outPorts')
  var links = this.graph.getConnectedLinks(parentBlock, {
    outbound: true
  })
  var elements = {},
    count = 0,
    fullHeight = 0
  _.each(links, function (link, i) {
    if (link.get('target').port === 'up') {
      var child = self.graph.getCell(link.get('target').id)
      fullHeight += child.getBBox().height
      count += 1
      var pos = outPorts.indexOf(link.get('source').port)
      elements[pos] = child
    }
  })
  fullHeight += (count - 1) * nodeSep

  var left = parentBlock.getBBox().x + parentBlock.getBBox().width + rankSep
  var top = parentBlock.getBBox().y - (fullHeight - parentBlock.getBBox().height) / 2

  _.each(elements, function (block, i) {
    block.set('position', {
      x: left,
      y: top
    })
    top += block.getBBox().height
    top += nodeSep
  })

  // return
  // joint.layout.DirectedGraph.layout(this.graph, _.extend({
  //   setLinkVertices: false,
  //   nodeSep: 100,
  //   rankSep: 100,
  //   edgeSep: 20,
  //   rankDir: 'LR'
  // }, options))
}

BlocksViewer.prototype.init = function () {
  var self = this

  self.app.ws.bind('blocks_tree', function (data) {
    self.loadTree(data)
  })

  this.graph = new joint.dia.Graph

  this.paper = new joint.dia.Paper({
    width: this.container.outerWidth(),
    height: this.container.outerHeight(),
    gridSize: 10,
    perpendicularLinks: true,
    model: this.graph,
    elementView: joint.shapes.blocks.BlockView
  })

  this.graph.on('add', function (cell) {
    if (cell.isLink()) {
      self.layout({
        parent: cell.get('source').id
      })
      var block = self.graph.getCell(cell.get('target').id)
      var bbox = block.getBBox()
      self.paperScroller.center(bbox.x + (bbox.width / 2), bbox.y)
    } else if (cell.blockData.blockId == 3) {
      self.paperScroller.zoomToFit({
        padding: 20
      })
      self.zoom(self.MAX_PAPER_SCALE)
    }
  })

  this.graph.on('remove', function (cell, collection, options) {
    if (cell.isLink()) {
      var child = this.getCell(cell.get('target').id)
      if (child) {
        child.remove()
      }
    } else {
      var blockId = cell.get('blockData').blockId
      delete self.blocks[blockId]
      self.graph.removeCell(cell)
      self.layout()
    }
  })

  this.paperScroller = new joint.ui.PaperScroller({
    autoResizePaper: true,
    padding: 50,
    paper: this.paper
  })

  $(this.container).append(this.paperScroller.render().el)

  this.nav = new joint.ui.Navigator({
    paperScroller: this.paperScroller,
    width: 240,
    height: 180,
    padding: 10,
    zoomOptions: {
      max: 2,
      min: 0.2
    }
  })
  this.nav.$el.appendTo('#navigator')
  this.nav.render()

  this.paper.on('blank:pointerdown', this.paperScroller.startPanning)
  this.paper.on('cell:nodeclick', function (cell, evt, index) {
    var node = cell.model.blockData.nodes[index]
    if (node.blockId) {
      self.get(node.blockId)
    }
  })

  this.app.elements.zoomInBtn.addEventListener('click', function () {
    self.zoom(self.ZOOM_DELTA)
  })
  this.app.elements.zoomOutBtn.addEventListener('click', function () {
    self.zoom(-self.ZOOM_DELTA)
  })
  this.app.elements.zoomToFitBtn.addEventListener('click', function () {
    self.paperScroller.zoomToFit()
    self.zoom(self.MAX_PAPER_SCALE)
  })
  this.app.elements.downloadSVGBtn.addEventListener('click', function () {
    self.paper.toSVG(function (svg) {
      svg = new Blob([svg], {
        type: 'image/svg+xml'
      })
      var link = $('<a>')
        .hide()
        .attr('href', URL.createObjectURL(svg))
        .attr('download', 'blocks.svg')
        .text('download')
      link.get(0).click()
        // link.remove()
    })
  })
  this.app.elements.downloadPNGBtn.addEventListener('click', function () {
    self.paper.toPNG(function (png) {
      var link = $('<a>')
        .hide()
        .attr('href', png)
        .attr('download', 'blocks.png')
        .text('download')
      link.get(0).click()
      link.remove()
    })
  })

  this.SYMBOL_12_WIDTH = (function () {
    var e = document.createElementNS('http://www.w3.org/2000/svg', 'text'),
      s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      w
    s.appendChild(e)
    s.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    s.setAttribute('version', '1.1')
    e.setAttribute('font-family', 'monospace')
    e.setAttribute('font-size', '12')
    e.textContent = 'aBcDeFgGhH'
    document.body.appendChild(s)
    w = e.getBBox().width / 10
    s.parentNode.removeChild(s)
    return w
  })()

  this.initWS()
}

BlocksViewer.prototype.initWS = function () {
  var self = this

  this.app.ws.onmessage = function () {
    if (self.app.viewType.is(':checked')) {
      return
    }
    self.wsmessage.apply(self, arguments)
  }
}

BlocksViewer.prototype.wsmessage = function (event) {
  var self = this
  try {
    var data = JSON.parse(event.data)
    $.each(data, function (i, glob) {

    })
  } catch (ex) {

  }
}

BlocksViewer.prototype.zoom = function (delta) {
  this.paperScroller.zoom(delta, {
    max: this.MAX_PAPER_SCALE,
    min: this.MIN_PAPER_SCALE
  })
}
