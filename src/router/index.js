const postRouter = require('./postRouter').postRouter
const tagRouter = require('./tagRouter')
const collectionRouter = require('./collectionRouter')

module.exports = [postRouter, tagRouter, collectionRouter]
