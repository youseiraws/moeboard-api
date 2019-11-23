const mongoose = require('mongoose')
const util = require('../../util/util')
const config = require('../../../config')

const ObjectId = mongoose.Schema.Types.ObjectId

const postSchema = new mongoose.Schema(
  {
    id: Number,
    tags: String,
    created_at: Number,
    creator_id: Number,
    author: String,
    change: Number,
    source: String,
    score: Number,
    md5: String,
    file_size: Number,
    file_url: String,
    is_shown_in_index: Boolean,
    preview_url: String,
    preview_width: Number,
    preview_height: Number,
    actual_preview_width: Number,
    actual_preview_height: Number,
    sample_url: String,
    sample_width: Number,
    sample_height: Number,
    sample_file_size: Number,
    jpeg_url: String,
    jpeg_width: Number,
    jpeg_height: Number,
    jpeg_file_size: Number,
    rating: String,
    has_children: Boolean,
    parent_id: Number,
    status: String,
    width: Number,
    height: Number,
    is_held: Boolean,
    frames_pending_string: String,
    frames_pending: Array,
    frames_string: String,
    frames: Array,
    flag_detail: String,
    post_ids: {
      preview: ObjectId,
      sample: ObjectId,
      jpeg: ObjectId,
      file: ObjectId,
    },
  },
  { id: false },
)

postSchema.statics = {
  async insertManyPost(posts) {
    if (!(posts instanceof Array)) return

    posts.forEach(async post => {
      if (!(await this.isPostExists(post.id))) await this.create(post)
      else if (await this.isPostExpired(post.id))
        await this.updateOne({ id: post.id }, post)
    })
  },
  async isPostExists(id) {
    return await this.exists({ id })
  },
  async isPostExpired(id) {
    if (!config.expired.enable) return true

    const post = await this.findOne({ id })
    if (post === null) return false

    return (
      Date.now() - post._id.getTimestamp().getTime() >
      util.getTimestamp(config.expired.time, config.expired.unit)
    )
  },
  saveImage(imageStream, id, postType, filename) {
    if (global.$gfs === undefined) return

    const writeStream = global.$gfs.createWriteStream({
      filename,
    })
    imageStream.pipe(writeStream)

    writeStream.on('close', async file => {
      let post = await this.findOne({ id })
      post.post_ids[postType] = file._id
      await post.save()
    })
  },
  async hasImageDownloaded(id, postType) {
    const post = await this.findOne({ id })
    if (post === null) return false

    return !(post.$isEmpty('post_ids') || post.post_ids[postType] === undefined)
  },
}

mongoose.model('Post', postSchema, 'posts')
