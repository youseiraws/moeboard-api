const Http = require('../util/http')
const config = require('../config')

const api = new Http(config.sourceURL)

module.exports = api