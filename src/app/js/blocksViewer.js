import $ from 'jquery';
import joint from 'jointjs'
require('./joint.shapes.blocks')

export class BlocksViewer {

  constructor(app, container) {
    this.app = app
    this.container = $(container)
    this.blocks = []
    this.blockData = []
    this.blocksParent = []
    this.blocksLeft = []

    this.ZOOM_DELTA = 0.2
    this.PAPER_SCALE = 1
    this.MIN_PAPER_SCALE = 0.2
    this.MAX_PAPER_SCALE = 2
    this.SYMBOL_12_WIDTH = 7

    this.init()
  }

  reset() {
    this.blocks = []
    this.blockData = []
    this.blocksParent = []
    this.blocksLeft = []

    this.graph.resetCells()
  }

  get(blockId) {
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

  loadTree(data) {
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

  add(blockId, blockData) {
    var self = this

    var block = new joint.shapes.blocks.Block({
      position: {
        x: 0,
        y: 0
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

  layout(options) {
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
  }

  init() {
    let self = this
    let relP = {
      x: 0,
      y: 0,
      trigger: false
    }


    self.app.ws.bind('blocks_tree', function (data) {
      self.loadTree(data)
    })

    this.graph = new joint.dia.Graph

    this.paper = new joint.dia.Paper({
      el: this.container,
      width: this.container.outerWidth(),
      height: this.container.outerHeight(),
      gridSize: 10,
      perpendicularLinks: true,
      model: this.graph,
      elementView: joint.shapes.blocks.BlockView
    })

    this.paper.toSVG = (callback) => {
      var svg = document.querySelector('svg');
      var data = (new XMLSerializer()).serializeToString(svg)
      callback(data)
    }

    this.paper.toPNG = (callback) => {
      var svg = document.querySelector('svg'),
        data = (new XMLSerializer()).serializeToString(svg),
        width = this.paper.getContentBBox().width,
        height = this.paper.getContentBBox().height

      var canvas = document.createElement('canvas')
      var ctx = canvas.getContext('2d')
      canvas.setAttribute("width", width);
      canvas.setAttribute("height", height);

      var img = new Image()
      img.width = width
      img.height = height
      img.onload = () => {
        ctx.drawImage(img, 0, 0, img.width, img.height);

        canvas.toBlob((blob) => {
          console.log(blob)
          callback(blob)
        })
      }
      img.src = 'data:image/svg+xml,' + data
    }

    this.graph.on('add', function (cell) {
      if (cell.isLink()) {
        self.layout({
          parent: cell.get('source').id
        })
        var block = self.graph.getCell(cell.get('target').id)
        var bbox = block.getBBox()
        // self.paperScroller.center(bbox.x + (bbox.width / 2), bbox.y)
      } else {
        self.zoom(self.MAX_PAPER_SCALE)
        self.zoomToFit()
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
        self.graph.removeCells(cell)
        self.layout()
      }
    })

    this.paper.on("blank:pointerdown", function (e) {
      relP.x = e.pageX
      relP.y = e.pageY
      relP.trigger = true
    })

    this.paper.on("blank:pointerup", function (e) {
      if (!relP.trigger) return
      self.paper.setOrigin(
        self.paper.options.origin.x + e.pageX - relP.x,
        self.paper.options.origin.y + e.pageY - relP.y
      )
      relP.trigger = false
    })

    var moveHandler = (e) => {
      if (!relP.trigger) {
        return
      }
      this.paper.setOrigin(
        this.paper.options.origin.x + e.pageX - relP.x,
        this.paper.options.origin.y + e.pageY - relP.y
      );
      relP.x = e.pageX; relP.y = e.pageY;
    }

    this.container.on('mousemove', moveHandler)
    this.container.on('mousetouch', moveHandler)

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
      self.zoomToFit()
      // self.zoom(self.MAX_PAPER_SCALE)
    })
    this.app.elements.downloadSVGBtn.addEventListener('click', () => {

      this.paper.toSVG((svg) => {
        svg = new Blob([svg], {
          type: 'image/svg+xml'
        })
        var link = $('<a>')
          .hide()
          .attr('href', URL.createObjectURL(svg))
          .attr('download', 'blocks.svg')
          .text('download')
        link.get(0).click()
        setTimeout(function () {
          link.remove()
        }, 10)
      })
    })
    this.app.elements.downloadPNGBtn.addEventListener('click', function () {
      self.paper.toPNG((png) => {
        var link = $('<a>')
          .hide()
          .attr('href', URL.createObjectURL(png))
          .attr('download', 'blocks.png')
          .text('download')
        link.get(0).click()
        setTimeout(function () {
          link.remove()
        }, 10)
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

  initWS() {
    var self = this

    this.app.ws.onmessage = function () {
      if (self.app.viewType.is(':checked')) {
        return
      }
      self.wsmessage.apply(self, arguments)
    }
  }

  wsmessage(event) {
    var self = this
    try {
      var data = JSON.parse(event.data)
      $.each(data, function (i, glob) {

      })
    } catch (ex) {

    }
  }

  zoom(delta) {
    var scaleOld = this.PAPER_SCALE
    var scaleDelta;

    var sw = this.container.width(),
      sh = this.container.height(),
      side = delta > 0 ? 1 : -1,
      ox = this.paper.options.origin.x,
      oy = this.paper.options.origin.y;
    if (typeof delta === "number") {
      this.PAPER_SCALE += delta * Math.min(
        0.3,
        Math.abs(this.PAPER_SCALE - (delta < 0 ? this.MIN_PAPER_SCALE : this.MAX_PAPER_SCALE)) / 2
      );
    } else { this.PAPER_SCALE = 1; }
    this.paper.scale(this.PAPER_SCALE, this.PAPER_SCALE);
    scaleDelta = side *
      (side > 0 ? this.PAPER_SCALE / scaleOld - 1 : (scaleOld - this.PAPER_SCALE) / scaleOld);
    this.paper.setOrigin(
      ox - (sw / 2 - ox) * scaleDelta,
      oy - (sh / 2 - oy) * scaleDelta
    );
  }

  zoomToFit() {
    const padding = 20
    this.paper.scale(1, 1)

    var sw = this.container.width() - (padding * 2),
      sh = this.container.height() - (padding * 2),
      ox = this.paper.options.origin.x,
      oy = this.paper.options.origin.y,
      bbox = this.paper.getContentBBox();

    this.PAPER_SCALE = Math.max(
      this.MIN_PAPER_SCALE,
      Math.min(
        this.MAX_PAPER_SCALE,
        Math.min(
          sw / bbox.width,
          sh / bbox.height,
        )
      )
    )

    this.paper.scale(this.PAPER_SCALE, this.PAPER_SCALE)
    bbox = this.paper.getContentBBox()
    this.paper.setOrigin(
      (sw - bbox.width) / 2 + padding,
      (sh - bbox.height) / 2 + padding
    )

  }
}
