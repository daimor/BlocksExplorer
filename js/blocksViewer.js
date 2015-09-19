var BlocksViewer = function (app, container) {
  var self = this

  this.app = app
  this.container = $(container)
  this.blocks = []
  this.blockData = []
  this.blocksParent = []

  this.ZOOM_DELTA = 0.2
  this.MIN_PAPER_SCALE = 0.2
  this.MAX_PAPER_SCALE = 4
  this.SYMBOL_12_WIDTH = 7

  this.init()
  return this
}

BlocksViewer.prototype.reset = function () {
  var self = this

  this.blocks = []
  this.blockData = []
  this.blocksParent = []

  this.graph.resetCells()
}

BlocksViewer.prototype.update = function (data) {
  var self = this

  this.reset()
}

BlocksViewer.prototype.get = function (blockId) {
  var self = this

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

  _.each(blockData.nodes, function (node, nodeId) {
    var nodeBlockId = node.blockId || 0
    if (nodeBlockId === 0) return

    self.blocksParent[node.blockId] = blockId
  })
  if (blockId === 3) {
    this.paperScroller.center()
    this.paperScroller.zoomToFit()
  }
  this.layout(block)
  this.paperScroller.center(block.getBBox().x, block.getBBox().y)
}

BlocksViewer.prototype.layout = function (block) {
  joint.layout.DirectedGraph.layout(this.graph, {
    setLinkVertices: false,
    nodeSep: 100,
    rankSep: 100,
    edgeSep: 50,
    rankDir: 'LR'
  })
}

BlocksViewer.prototype.init = function () {
  var self = this

  this.graph = new joint.dia.Graph

  this.paper = new joint.dia.Paper({
    // el: this.container,
    width: this.container.outerWidth(),
    height: this.container.outerHeight(),
    gridSize: 20,
    perpendicularLinks: true,
    model: this.graph,
    elementView: joint.shapes.blocks.BlockView
  })

  this.graph.on('remove', function (cell, collection, options) {
    if (cell.isLink()) {
      var child = this.getCell(cell.get('target').id)
      child.remove()
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
    width: 300,
    height: 200,
    padding: 10,
    zoomOptions: { max: 2, min: 0.2 }
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

  // this.app.elements.blocksViewer.addEventListener('mousewheel', function (e) {
  //   self.zoom(Math.max(-self.ZOOM_DELTA, Math.min(self.ZOOM_DELTA, e.wheelDelta || -e.detail)))
  // })

  this.app.elements.zoomInBtn.addEventListener('click', function () {
    self.zoom(self.ZOOM_DELTA)
  })
  this.app.elements.zoomOutBtn.addEventListener('click', function () {
    self.zoom(-self.ZOOM_DELTA)
  })
  this.app.elements.zoomToFitBtn.addEventListener('click', function () {
    self.paperScroller.zoomToFit()
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
}

BlocksViewer.prototype.zoom = function (delta) {
  this.paperScroller.zoom(delta, {
    max: this.MAX_PAPER_SCALE,
    min: this.MIN_PAPER_SCALE
  })
}
