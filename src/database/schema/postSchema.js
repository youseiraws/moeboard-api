const fs = require('fs')
const path = require('path')
const stream = require('stream')
const mongoose = require('mongoose')
const util = require('../../util/util')
const config = require('../../../config')

const ObjectId = mongoose.Schema.Types.ObjectId
const cache = config.cache

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
    [cache]: {
      preview: {
        id: ObjectId,
        path: String,
      },
      sample: {
        id: ObjectId,
        path: String,
      },
      jpeg: {
        id: ObjectId,
        path: String,
      },
      file: {
        id: ObjectId,
        path: String,
      },
    },
  },
  { id: false },
)

postSchema.statics = {
  async synchronizePosts(posts) {
    if (!(posts instanceof Array)) return posts

    this.insertPosts(posts)

    return await this.mergeLocalImages(posts)
  },
  insertPosts(posts) {
    posts.forEach(async post => {
      if (!(await this.isPostExists(post.id))) await this.create(post)
      else if (await this.isPostExpired(post.id))
        await this.updateOne({ id: post.id }, post)
    })
  },
  async mergeLocalImages(posts) {
    return await Promise.all(
      posts.map(async post => {
        const localPost = await this.findOne({ id: post.id })
        if (localPost !== null && !localPost.$isEmpty(cache)) {
          const localPostObj = localPost.toObject()
          await Promise.all(
            Object.keys(localPostObj[cache]).map(async type => {
              const base64 = await this.getImageBase64(
                localPostObj[cache][type],
                localPostObj.id,
                type,
                localPostObj[`${type}_url`].split('/').reverse()[0],
              )
              if (base64 !== undefined) {
                if (post[cache] === undefined) post[cache] = {}
                post[cache][type] = `data:image/${
                  localPostObj[`${type}_url`].split('.').reverse()[0]
                };base64,${base64}`
              }
            }),
          )
        }

        return post
      }),
    )
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
  saveImage(imageStream, id, postType, imageName) {
    this.saveImageToDB(imageStream, id, postType, imageName)
    this.saveImageToCache(imageStream, id, postType, imageName)
  },
  saveImageToDB(imageStream, id, postType, imageName) {
    if (global.$gfs === undefined) return
    const gridFsStream = global.$gfs.createWriteStream({ imageName })
    imageStream.pipe(gridFsStream)
    gridFsStream.on('close', async file => {
      let post = await this.findOne({ id })
      post[cache][postType].id = file._id
      await post.save()
    })
  },
  saveImageToCache(imageStream, id, postType, imageName) {
    const filePath = path.resolve(cache, id.toString(), postType)
    const fileName = path.resolve(filePath, imageName)
    if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true })
    const cacheStream = fs.createWriteStream(fileName)
    imageStream.pipe(cacheStream)
    cacheStream.on('close', async () => {
      let post = await this.findOne({ id })
      post[cache][postType].path = fileName
      await post.save()
    })
  },
  async hasImageDownloaded(id, postType) {
    const post = await this.findOne({ id })
    if (post === null) return false

    return !(post.$isEmpty(cache) || post[cache][postType].id === undefined)
  },
  async getImageBase64(type, id, postType, imageName) {
    if (type.path !== undefined && fs.existsSync(type.path))
      return await util.toImageBase64(fs.createReadStream(type.path))
    else
      this.saveImageToCache(
        global.$gfs.createReadStream({ _id: type.id }),
        id,
        postType,
        imageName,
      )
  },
}

mongoose.model('Post', postSchema, 'posts')
