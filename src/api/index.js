const Http = require('../util/http')

const api = new Http(sourceToUrl(global.$config.source))

function sourceToUrl(source) {
  switch (source) {
    case 'konachan':
      return 'https://konachan.com'
  }
}

module.exports = api
