const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const config = require('../../config')

function connect(source = config.source) {
  mongoose.connect(`${config.mongoDBUri}${source}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  const conn = mongoose.connection
  conn.once('open', () => (global.$gfs = Grid(conn.db, mongoose.mongo)))
}

module.exports = {
  connect,
  postSchema: require('./schema/postSchema'),
}
