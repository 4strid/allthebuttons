const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)

const chokidar = require('chokidar')
const mime = require('mime')
const gzip = promisify(require('zlib').gzip)
const gzipStream = require('zlib').createGzip

function Static (opts) {
  const staticRoot = opts.path
  const maxCachedSize = 'maxCachedSize' in opts ? opts.maxCachedSize : 1024 * 50
  const expirationOffset = 'expires' in opts ? opts.expires : 1000 * 60 * 60 * 24
  const defaultExtension = opts.defaultExtension || '.html'

  const fileTable = {}
  
  const watcher = chokidar.watch(staticRoot)

  watcher.on('add', addFile)
  watcher.on('change', addFile)
  watcher.on('unlink', rmFile)

  const gzipTypes = {
    'text/plain': true,
    'text/html': true,
    'text/xml': true,
    'text/css': true,
    'application/xml': true,
    'application/xhtml+xml': true,
    'application/rss+xml': true,
    'application/javascript': true,
    'application/x-javascript': true,
  }

  async function addFile (filepath, stats) {
    const _path = getStaticPath(staticRoot, filepath)
    const mimeType = mime.getType(filepath)
    const extension = path.extname(filepath)
    const basename = path.basename(filepath)

    const shouldGzip = opts.gzip !== false && stats.size > 1500 && gzipTypes[mimeType]

    const file = {
      file: filepath,
      modified: stats.mtime,
      mimeType,
      gzip: shouldGzip,
    }

    if (stats.size <= maxCachedSize) {
      try {
        file.cached = await getFile(file.file, file.gzip)
      } catch (err) {
        console.error(err)
      }
    }

    if (opts.autoindex !== false && basename === 'index.html') {
      const dirname = path.dirname(filepath)
      const _path = getStaticPath(staticRoot, dirname)
      fileTable[_path] = file
    }

    if (opts.defaultExtension !== false && extension === defaultExtension) {
      const dirname = path.dirname(filepath)
      const basename = path.basename(filepath, defaultExtension)
      const _path = getStaticPath(staticRoot, dirname) + basename
      fileTable[_path] = file
    }

    fileTable[_path] = file
  }

  function rmFile (filepath) {
    const _path = getStaticPath(staticRoot, filepath)
    fileTable[_path] = undefined
  }

  const middleware = function serve (req, res) {
    const requested = req.url
    const file = fileTable[requested]

    if (file !== undefined) {
      res.setHeader('Content-Type', file.mimeType)
      res.setHeader('Last-Modified', file.modified.toUTCString())
      res.setHeader('Expires', new Date(new Date().getTime() + expirationOffset).toUTCString())
      res.setHeader('Cache-Control', 'public')

      const modifiedSince = req.headers['if-modified-since']
      // add 1 second to account for rounding
      if (modifiedSince === undefined || getTime(modifiedSince) + 1000 < getTime(file.modified)) {
        const shouldGzip = req.headers['accept-encoding'] && req.headers['accept-encoding']
          .split(',')
          .some(x => ['*', 'gzip'].includes(x.trim()))
          && file.gzip
        if (shouldGzip) {
          res.setHeader('Content-Encoding', 'gzip')
          res.setHeader('Vary', 'Content-Encoding')
        }
        if (file.cached && (!!shouldGzip === !!file.gzip)) {
          res.end(file.cached)
        } else {
          const stream = fs.createReadStream(file.file)
          if (shouldGzip) {
            stream.pipe(gzipStream()).pipe(res)
          } else {
            stream.pipe(res)
          }
          let streamError = null
          stream.on('error', err => {
            streamError = err
            stream.destroy()
          })
          stream.on('close', () => {
            if (!streamError) {
              // this seems fine ?
            } else {
              res.setHeader('Content-Encoding', 'identity')
              throw streamError
            }
          })
        }
      } else {
        res.statusCode = 304
        res.end()
      }
    } else {
      res.statusCode = 404
      res.end('Error 404: file not found')
    }
  }

  middleware.dump = () => fileTable
  middleware.memUsage = () => Object.values(fileTable).reduce((sum, file) => sum + (file.cached ? file.cached.length : 0), 0)

  return middleware
}

function getStaticPath (root, _path) {
  return '/' + path.relative(root, _path).replace(/\\/g, '/')
}

// throws if it encounters an error
async function getFile (filepath, shouldGzip) {
  let data = await readFile(filepath)
  if (shouldGzip) {
    data = await gzip(data)
  }
  return data
}

function getTime (date) {
  return new Date(date).getTime()
}

module.exports = Static
