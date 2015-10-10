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

joint.shapes.blocks.Block = joint.shapes.devs.Model.extend(_.extend({}, joint.shapes.basic.PortsModelInterface, {

  markup: [
    '<g class="rotatable">',
    '<g class="scalable block">',
    '<rect class="blocks-id-rect"/>',
    '<rect class="blocks-info-rect"/>',
    '<rect class="blocks-nodes-rect"/>',
    '</g>',
    '<text class="blocks-id-text"/>',
    '<text class="blocks-info-text"/>',
    '<text class="blocks-nodes-text"/>',
    '<g class="leftPort extPorts allPorts"/>',
    '<g class="rightPort extPorts allPorts"/>',
    '<g class="upPort extPorts allPorts"/>',
    '<g class="outPorts allPorts"/>',
    '</g>'
  ].join(''),
  portMarkup: [
    '<g class="port port<%= id %>">',
    '<circle class="port-body"/>',
    '</g>'
  ].join(''),

  defaults: joint.util.deepSupplement({

    type: 'blocks.Block',
    MIN_WIDTH: 100,
    size: {
      width: 150,
      height: 200
    },

    extPorts: ['up', 'left', 'right'],
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
        r: 4,
        magnet: true,
        stroke: '#000000'
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
      case 24:
      case 66:
      default:
        this.fillColor = 'powderblue'
    }

    this.updateRectangles()

    this.updatePortsAttrs()
    this.on('change:allPorts', this.updatePortsAttrs, this)

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

  updatePortsAttrs: function () {
    var currAttrs = this.get('attrs')
    _.each(this._portSelectors, function (selector) {
      if (currAttrs[selector]) delete currAttrs[selector]
    })

    this._portSelectors = []

    var attrs = {}

    _.each(this.get('extPorts'), function (portName, index, ports) {
      var portAttributes = this.getPortAttrs(portName, index, 1, '.' + portName + 'Port', 'ext')
      this._portSelectors = this._portSelectors.concat(_.keys(portAttributes))
      _.extend(attrs, portAttributes)
    }, this)

    _.each(this.get('outPorts'), function (portName, index, ports) {
      var portAttributes = this.getPortAttrs(portName, index, ports.length, '.outPorts', 'out')
      this._portSelectors = this._portSelectors.concat(_.keys(portAttributes))
      _.extend(attrs, portAttributes)
    }, this)

    this.attr(attrs, {
      silent: true
    })
    this.processPorts()
    this.trigger('process:ports')
  },

  getPortAttrs: function (portName, index, total, selector, type) {
    var attrs = {}

    var portClass = 'port' + index
    var portSelector = selector + '>.' + portClass
    var portBodySelector = portSelector + '>.port-body'

    attrs[portBodySelector] = {
      port: {
        id: portName || _.uniqueId(type),
        type: type
      }
    }

    var ref,
      refX,
      refY,
      refDX,
      refDY
    if (portName === 'up') {
      ref = '.blocks-id-rect'
      refY = 8
    } else if (portName === 'left') {
      ref = '.blocks-id-rect'
      refX = 0.5
      refY = 0
    } else if (portName === 'right') {
      ref = '.block'
      refX = 0.5
      refDY = 0
    } else {
      ref = '.blocks-nodes-rect'
      refY = (index + 0.5) * (1 / total)
      refDX = 0
    }

    attrs[portSelector] = {
      ref: ref,
      'ref-x': refX,
      'ref-y': refY,
      'ref-dx': refDX,
      'ref-dy': refDY
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
  renderPorts: function () {
    
    var $extPorts = this.$('.extPorts').empty()
    var $outPorts = this.$('.outPorts').empty()
    
    var portTemplate = _.template(this.model.portMarkup)

    _.each(_.filter(this.model.ports, function (p) {
      return p.type === 'ext'
    }), function (port, index) {

      var $port = $extPorts.filter('.' + port.id + 'Port')
      $port.append(V(portTemplate({
        id: index,
        port: port
      })).node)
    })

    _.each(_.filter(this.model.ports, function (p) {
      return p.type === 'out'
    }), function (port, index) {

      $outPorts.append(V(portTemplate({
        id: index,
        port: port
      })).node)
    })
  },

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
