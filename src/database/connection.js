const mongoose = require('mongoose')
const Grid = require('gridfs-stream')

exports.connect = function(source = global.$config.source) {
  mongoose.connect(`${global.$config.mongoDBUri}${source}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  const conn = mongoose.connection
  conn.once('open', () => (global.$gfs = Grid(conn.db, mongoose.mongo)))

  module.exports = {
    postSchema: require('./schema/postSchema'),
  }
}
