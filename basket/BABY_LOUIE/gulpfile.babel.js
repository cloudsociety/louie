'use strict';

import plugins                from 'gulp-load-plugins';
import yargs                  from 'yargs';
import browser                from 'browser-sync';
import gulp                   from 'gulp';
import rimraf                 from 'rimraf';
import yaml                   from 'js-yaml';
import fs                     from 'fs';
import webpackStream          from 'webpack-stream';
import webpack2               from 'webpack';
import named                  from 'vinyl-named';
import path                   from 'path';

// Better image compression
import imageminJpegRecompress from 'imagemin-jpeg-recompress';
import imageminPngquant       from 'imagemin-pngquant';

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// Load settings from config.yml
const { COMPATIBILITY, PORT, PATHS } = loadConfig();

function loadConfig() {
  let ymlFile = fs.readFileSync('config.yml', 'utf8');
  return yaml.load(ymlFile);
}

// Build the "dist" folder by running all of the below tasks
gulp.task('build',
 gulp.series(clean, gulp.parallel(sass, javascript, images, sprites, datauriSprites)));

// Build the site, run the server, and watch for file changes
gulp.task('default',
  gulp.series('build', watch));

// Clean it out.
gulp.task('clean',
  gulp.series(clean));

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
  rimraf(PATHS.cssDir, done);
  rimraf(PATHS.jsDir, done);
  rimraf(PATHS.imgDir, done);
  rimraf(PATHS.spriteDir, done);
}

// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {
  return gulp.src(PATHS.src + '/scss/**/*.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.sass
    })
      .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    // Comment in the pipe below to run UnCSS in production
    //.pipe($.if(PRODUCTION, $.uncss(UNCSS_OPTIONS)))
    .pipe($.if(PRODUCTION, $.cleanCss({ compatibility: 'ie9' })))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write('.')))
    .pipe(gulp.dest(PATHS.cssDir));
    // .pipe(browser.reload({ stream: true }));
}

let webpackConfig = {
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules')
    ]
  },
  module: {
    rules: [
      {
        test: /.js$/,
        use: [
          {
            loader: 'babel-loader'
          }
        ]
      }
    ]
  }
}
// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
  return gulp.src(PATHS.entries)
    .pipe(named())
    .pipe($.sourcemaps.init())
    .pipe(webpackStream(webpackConfig, webpack2))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', e => { console.log(e); })
    ))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.jsDir));
}

// Copy images to the "dist" folder
// In production, the images are compressed
function images() {
  return gulp.src(PATHS.src + '/images/**/*.{png,jpeg,jpg,svg,png}')
    .pipe($.if(PRODUCTION, $.imagemin([
      $.imagemin.gifsicle(),
      $.imagemin.jpegtran(),
      $.imagemin.optipng(),
      $.imagemin.svgo(),
      imageminJpegRecompress(),
      imageminPngquant(),
    ])))
    .pipe(gulp.dest(PATHS.imgDir));
}

// Basic configuration example
var spriteConfig = {
  mode: {
    css: {
      // Change below to remove cache-busting feature.
      bust: false,
      render: {
        scss: {
          template: './src/sprite-templates/sprite-template.scss',
          dest: '_sprite.scss'
        }
      },
      example: true
    },
    symbol: {
      inline: true,
      prefix: 'icon-%s',
      example: true
    }
  }
};

// Create sprite files
function sprites() {
  return gulp.src(PATHS.src + '/sprites/**/*')
    .pipe($.svgSprite(spriteConfig))
    .pipe(gulp.dest(PATHS.spriteDir));
}

// Create datauri variables.
function datauriSprites() {
  return gulp.src(PATHS.src + '/sprites/**/*')
    .pipe($.spriteDatauri({
        fileName: '_icon-vars.scss',
        // Get icons in various colors using the config below.
        // colors: {
        //   white: '#ffffff',
        //   blue: '#0000ff'
        // }
      })
    )
    .pipe(gulp.dest(PATHS.spriteDir + '/datauri'));
}

// // Start a server with BrowserSync to preview the site in
// function server(done) {
//   browser.init({
//     server: PATHS.dist, port: PORT
//   });
//   done();
// }

// // Reload the browser with BrowserSync
// function reload(done) {
//   browser.reload();
//   done();
// }

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
  gulp.watch(PATHS.src + '/**/*.scss').on('all', sass);
  gulp.watch(PATHS.src + '/**/*.js').on('all', javascript);
  gulp.watch(PATHS.src + '/images/**/*').on('all', images);
  gulp.watch(PATHS.src + '/sprites/**/*').on('all', sprites);
  gulp.watch(PATHS.src + '/sprites/**/*').on('all', datauriSprites);
}
