var through = require('through2')
var gutil = require('gulp-util')
var PluginError = gutil.PluginError
var File = gutil.File
var fs = require('fs')
var xml2js = require('xml2js')
var parser = new xml2js.Parser({
  attrKey: '$',
  preserveChildrenOrder: true,
  async: true,
  explicitCharkey: true,
  explicitRoot: false,
  explicitArray: true
})
var builder = new xml2js.Builder({
  cdata: true,
  rootName: 'Export'
})

var types = {
  'Class': 'CLS',
  'CSP': 'CSP',
  'CSPBase64': 'CSP'
}

module.exports = function(file, options) {
  options = options || {}

  var xml = {
    '$': {}
  }
  var project = {
    '$': {},
    'Items': [{
      ProjectItem: []
    }]
  }

  if (typeof file === 'string') {
    fileName = file
  } else if (typeof file.path === 'string') {
    fileName = path.basename(file.path)
  } else {
    throw new PluginError('gulp-cachebuild', 'Missing path in file options for gulp-cachebuild')
  }

  function bufferContents(file, enc, cb) {
    if (file.isNull()) {
      cb()
      return
    }

    if (file.isStream()) {
      cb()
      return
    }

    var data = String(file.contents).replace(/\r/g, '')
    parser.parseString(data, function(err, result) {
      var exportData = result
      if (!xml.$.generator && exportData.$.generator) xml.$.generator = exportData.$.generator
      if (!xml.$.version && exportData.$.version) xml.$.version = exportData.$.version
      var keys = Object.keys(exportData)
      keys.forEach(function(key) {
        if (key == '$') {
          return
        }
        var items = exportData[key]
        items.forEach(function(exportItem) {
          var type = key === 'Routine' ? exportItem.$.type : types[key]
          console.log(key, file.path)
          if (key == 'Project') {
            project.$.name = exportItem.$.name
          } else if (type) {
            var name = exportItem.$.name
            console.log(type, name)
            if (type == 'CSP' && options.cspApplication) {
              exportItem.$.application = options.cspApplication
            }
            xml[key] = xml[key] || []
            xml[key].push(exportItem)

            var name = exportItem.$.name
            if (exportItem.$.application) {
              name = exportItem.$.application + name
            }

            project.Items[0].ProjectItem.push({
              '$': {
                name: name,
                type: type
              }
            })
          }
        })
      })
      cb()
    })
  }

  function endStream(cb) {
    if (!xml) {
      cb()
      return
    }

    xml.Project = [project]

    var cacheFile = new File({
      cwd: '',
      base: '',
      path: fileName,
      contents: new Buffer(builder.buildObject(xml))
    })
    this.push(cacheFile)
    cb()
  }

  return through.obj(bufferContents, endStream)
}
