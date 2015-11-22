var gulp = require('gulp')
var clean = require('gulp-clean')
var concat = require('gulp-concat')
var uglify = require('gulp-uglify')
var cheerio = require('gulp-cheerio')
var htmlReplace = require('gulp-html-replace')
var fs = require('fs')
var cacheBuilder = require('./gulp-cachebuild')

gulp.task('default', ['build'])

gulp.task('build', ['xml'])

gulp.task('clean', function() {
  return gulp.src([
      './build/'
    ], {
      read: false
    })
    .pipe(clean())
})

gulp.task('html', ['clean'], function() {
  return gulp.src('index.html')
    .pipe(htmlReplace({
      js: 'js/app.min.js',
      css: 'css/styles.min.css'
    }))
    .pipe(gulp.dest('./build/'))
})

gulp.task('js', ['clean'], function() {
  return gulp.src([
      'js/joint.all.min.js',
      'js/joint.shapes.blocks.js',
      'js/blocksViewer.js',
      'js/mapViewer.js',
      'js/wsEventDispatcher.js',
      'js/main.js'
    ])
    .pipe(concat('app.min.js'))
    .pipe(uglify({

    }))
    .pipe(gulp.dest('./build/js/'))
})

gulp.task('css', ['clean'], function() {
  return gulp.src([
      'css/joint.all.min.css',
      'css/main.css'
    ])
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest('./build/css/'))
})


gulp.task('xml', ['clean', 'css', 'js', 'html'], function() {
  return gulp.src([
      './BlocksExplorer.prj.xml',
      './Blocks/**/*.xml'
    ])
    .pipe(cacheBuilder('CacheBlocksExplorer.xml', {
      cspApplication: ''
    }))
    .pipe(cheerio({
      run: function($, file) {
        var staticFiles = [{
          name: 'index.html',
          file: './build/index.html'
        }, {
          name: 'js/app.min.js',
          file: './build/js/app.min.js'
        }, {
          name: 'css/styles.min.css',
          file: './build/css/styles.min.css'
        }]

        staticFiles.map(function(fileInfo) {
          try {
            $('Class[name="Blocks.Router"]').append($('<XData>')
              .attr('name', fileInfo.name.replace(/\./g, '_'))
              .append('<Description>*base64*</Description>')
              .append(
                $('<Data><![CDATA[ <data>' + (fs.readFileSync(fileInfo.file, {
                  encoding: 'base64'
                })).replace(/[\n\r]/g, '') + '</data> ]]> </Data>')
              )
            )
          } catch (err) {
            console.log(err)
          }
        })

      },
      parserOptions: {
        xmlMode: true,
        prettify: true
      }
    }))
    .pipe(gulp.dest('./build/'))
})
