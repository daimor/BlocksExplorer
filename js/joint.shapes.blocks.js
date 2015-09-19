if (typeof exports === 'object') {
  var joint = {
    util: require('../src/core').util,
    shapes: {
      basic: require('./joint.shapes.basic')
    },
    dia: {
      ElementView: require('../src/joint.dia.element').ElementView,
      Link: require('../src/joint.dia.link').Link
    }
  }
  var _ = require('lodash')
}

joint.shapes.blocks = {}

joint.shapes.blocks.Block = joint.shapes.basic.Generic.extend(_.extend({}, joint.shapes.basic.PortsModelInterface, {

  markup: [
    '<g class="rotatable">',
    '<g class="scalable">',
    '<rect class="blocks-id-rect"/>',
    '<rect class="blocks-info-rect"/>',
    '<rect class="blocks-nodes-rect"/>',
    '</g>',
    '<text class="blocks-id-text"/>',
    '<text class="blocks-info-text"/>',
    '<text class="blocks-nodes-text"/>',
    '<g class="inPorts"/>',
    '<g class="outPorts"/>',
    '</g>'
  ].join(''),
  portMarkup: [
    '<g class="port port<%= id %>">',
    '<circle class="port-body"/>',
    '<text class="port-label"/>',
    '</g>'
  ].join(''),

  defaults: joint.util.deepSupplement({

    type: 'blocks.Block',
    MIN_WIDTH: 100,
    size: {
      width: 150,
      height: 200
    },

    inPorts: ['up'],
    outPorts: [],

    attrs: {
      '.': {
        magnet: true
      },
      rect: {
        stroke: 'black',
        width: 150
      },
      text: {
        'fill': 'black',
        'font-size': 12,
        'pointer-events': 'none'
      },
      '.blocks-id-rect': {},
      '.blocks-id-text': {
        'ref': '.blocks-id-rect',
        'ref-x': 5,
        'ref-y': 3
      },
      '.blocks-info-rect': {},
      '.blocks-info-text': {
        'ref': '.blocks-info-rect',
        'ref-x': 5,
        'ref-y': 3
      },
      '.blocks-nodes-label': {
        ref: '.blocks-nodes-rect',
        'font-size': 10
      },
      '.blocks-nodes-rect': {},
      '.blocks-nodes-text': {
        'ref': '.blocks-nodes-rect',
        'ref-y': 2,
        'ref-x': 8
      },
      '.port-body': {
        r: 6,
        magnet: true,
        stroke: '#000000'
      },
      '.inPorts .port-label': {
        x: -15,
        dy: 4,
        'text-anchor': 'end',
        fill: '#000000'
      },
      '.outPorts .port-label': {
        x: 5,
        dy: 1,
        fill: '#000000'
      }
    },

    dataBlock: {}

  }, joint.shapes.basic.Generic.prototype.defaults),

  initialize: function () {
    var self = this
    var SYMBOL_12_WIDTH = this.get('SYMBOL_12_WIDTH') || 6.6
    this.blockData = this.get('blockData')

    this.rects = [{
      type: 'id',
      text: [
        'Block # ' + this.blockData.blockId
      ]
    }, {
      type: 'info',
      text: [
        'Type: ' + this.blockData.type + '      ' +
                  this.blockData.typename,
        'Link: ' + (this.blockData.link || 0)
      ]
    }]

    var nodesRect = {
      type: 'nodes',
      text: []
    }
    var outPorts = []
    _.each(this.blockData.nodes, function (node) {
      var text = (nodesRect.text.length + 1) + ') ' + node.print
      if (node.blockId) {
        text += ' - ' + node.blockId
        outPorts.push('node' + node.blockId)
      }
      nodesRect.text.push(text)
    })
    nodesRect.text.push('')

    this.get('attrs').blocktype = this.blockData.type

    this.rects.push(nodesRect)
    this.set('outPorts', outPorts)

    this.defaults.size.width = Math.max(this.defaults.MIN_WIDTH, 150)
    _.each(this.rects, function (rect) {
      rect.text.forEach(function (s) {
        var t = s.length * SYMBOL_12_WIDTH + 20
        if (t > self.defaults.size.width) {
          self.defaults.size.width = t
        }
      })
    })

    switch (this.blockData.type) {
      case 9:
        this.fillColor = 'coral'
        break
      case 70:
        this.fillColor = 'moccasin'
        break
      case 8:
        this.fillColor = 'palegreen'
        break
      case 6:
        this.fillColor = 'honeydew'
        break
      default:
        this.fillColor = 'powderblue'
    }

    this.updateRectangles()

    this.updatePortsAttrs()
    this.on('change:inPorts change:outPorts', this.updatePortsAttrs, this)

    this.on('change:name change:attributes change:methods', function () {
      this.updateRectangles()
      this.trigger('blocks-update')
    }, this)

    joint.shapes.basic.Generic.prototype.initialize.apply(this, arguments)
  },

  updateRectangles: function () {
    var self = this
    var attrs = this.get('attrs')

    var offsetY = 0

    _.each(this.rects, function (rect) {
      var lines = _.isArray(rect.text) ? rect.text : [{
        text: rect.text
      }]

      var rectHeight = (lines.length - (rect.type === 'nodes' ? 1 : 0)) * 12 + (lines.length ? 4 : 0)
      var rectText = attrs['.blocks-' + rect.type + '-text']
      var rectRect = attrs['.blocks-' + rect.type + '-rect']

      if (rect.type === 'id' || rect.type === 'info') {
        rectRect.fill = self.fillColor
      }

      rectText.text = lines.join('\n')
      rectRect.transform = 'translate(0,' + offsetY + ')'

      rectRect.height = rectHeight
      offsetY += rectHeight
    })

    this.attributes.size.height = offsetY
    this.attributes.size.width = this.defaults.size.width
    this.attributes.attrs.rect.width = this.defaults.size.width
  },

  getPortAttrs: function (portName, index, total, selector, type) {
    var attrs = {}

    var portClass = 'port' + index
    var portSelector = selector + '>.' + portClass
    var portLabelSelector = portSelector + '>.port-label'
    var portBodySelector = portSelector + '>.port-body'

    attrs[portLabelSelector] = {
      text: ''
    }
    attrs[portBodySelector] = {
      port: {
        id: portName || _.uniqueId(type),
        type: type
      }
    }

    attrs[portSelector] = {
      ref: '.blocks-nodes-rect',
      'ref-y': (index + 0.5) * (1 / total)
    }

    if (selector === '.outPorts') {
      attrs[portSelector]['ref-dx'] = 0
    }

    return attrs
  }
}))

joint.shapes.blocks.Link = joint.dia.Link.extend({

  defaults: {
    type: 'blocks.Link',
    smooth: true,
    attrs: {
      '.connection': {
        'stroke-width': 2
      },
      '.marker-target': {
        d: 'M10,0L0,5L10,10L8,5z',
        fill: 'black'
      }
    },
    router: {
      name: 'manhattan'
    },
    connector: {
      name: 'rounded'
    }
  }
})

joint.shapes.blocks.BlockView = joint.dia.ElementView.extend(_.extend({}, joint.shapes.basic.PortsViewInterface, {
  pointerclick: function (evt, x, y) {
    if ($(evt.target).parent().is('.blocks-nodes-text')) {
      var index = $(evt.target).index()
      this.notify('cell:nodeclick', evt, index)
    }
  }
}))

if (typeof exports === 'object') {
  module.exports = joint.shapes.blocks
}
