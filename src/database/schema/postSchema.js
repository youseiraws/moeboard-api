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
        url: String,
      },
      sample: {
        id: ObjectId,
        path: String,
        url: String,
      },
      jpeg: {
        id: ObjectId,
        path: String,
        url: String,
      },
      file: {
        id: ObjectId,
        path: String,
        url: String,
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
              const url = await this.getCacheImageUrl(
                localPostObj[cache][type],
                localPostObj.id,
                type,
                localPostObj[`${type}_url`].split('/').reverse()[0],
              )
              if (url !== undefined) {
                if (post[cache] === undefined) post[cache] = {}
                post[cache][type] = url
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
      await this.saveImagePath(id, postType, imageName)
      await this.saveImageUrl(id, postType, imageName)
    })
  },
  async saveImagePath(id, postType, imageName) {
    let post = await this.findOne({ id })
    if (post === null) return ''

    const imagePath = path.resolve(cache, id.toString(), postType, imageName)
    post[cache][postType].path = imagePath
    await post.save()
    return imagePath
  },
  async saveImageUrl(id, postType, imageName) {
    let post = await this.findOne({ id })
    if (post === null) return ''

    const imageUrl = [id.toString(), postType, imageName].join('/')
    post[cache][postType].url = imageUrl
    await post.save()
    return imageUrl
  },
  async hasImageDownloaded(id, postType) {
    const post = await this.findOne({ id })
    if (post === null) return false

    return !(post.$isEmpty(cache) || post[cache][postType].id === undefined)
  },
  async getCacheImageUrl(type, id, postType, imageName) {
    if (type.path !== undefined && fs.existsSync(type.path)) {
      const relativePath =
        type.url !== undefined
          ? type.url
          : await this.saveImageUrl(id, postType, imageName)
      return `http://${config.hostname}:${config.port}/${relativePath}`
    } else
      this.saveImageToCache(
        global.$gfs.createReadStream({ _id: type.id }),
        id,
        postType,
        imageName,
      )
  },
}

mongoose.model('Post', postSchema, 'posts')
