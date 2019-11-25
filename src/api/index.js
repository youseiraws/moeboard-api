const Http = require('../util/http')
const config = require('../../config')

const api = new Http(sourceToUrl(config.source))

function sourceToUrl(source) {
  switch (source) {
    case 'konachan':
      return 'https://konachan.com'
  }
}

module.exports = api
