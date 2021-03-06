const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const mongoose = require('mongoose')
const util = require('../../util/util')

const ObjectId = mongoose.Schema.Types.ObjectId
const cache = global.$config.cache
const expired = global.$config.expired
const cachePostTypes = global.$config.cachePostTypes
const cropType = 'crop'

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
    flag_detail: Object,
    operate_time: Number,
    [cache]: {
      tags: Array,
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
      crop: {
        id: ObjectId,
        path: String,
        url: String,
      },
    },
  },
  { id: false },
)

postSchema.statics = {
  async insertPosts(posts) {
    if (!(posts instanceof Array)) return

    await Promise.all(
      posts.map(async post => {
        if (!(await this.isPostExists(post.id))) {
          post.operate_time = Date.now()
          await this.create(post)
        } else if (await this.isPostExpired(post.id)) {
          post.operate_time = Date.now()
          await this.updateOne({ id: post.id }, post)
        }
      }),
    )
  },
  async isPostExists(id) {
    return await this.exists({ id })
  },
  async isPostExpired(id) {
    if (!expired.enable) return true

    const post = await this.findOne({ id })
    if (post === null) return false

    return (
      Date.now() - post.operate_time >
      util.getTimestamp(expired.time, expired.unit)
    )
  },
  async saveImage(imageStream, id, postType, imageName) {
    await Promise.all([
      this.saveImageToDB(imageStream, id, postType, imageName),
      this.saveImageToCache(imageStream, id, postType, imageName),
    ])
  },
  saveImageToDB(imageStream, id, postType, imageName) {
    return new Promise(resolve => {
      if (global.$gfs === undefined) return

      const gridFsStream = global.$gfs.createWriteStream({ imageName })
      gridFsStream.on('close', async file => {
        let post = await this.findOne({ id })
        post[cache][postType].id = file._id
        await post.save()
        resolve()
      })
      gridFsStream.on('error', err => {})
      imageStream.pipe(gridFsStream)
    })
  },
  saveImageToCache(imageStream, id, postType, imageName) {
    return new Promise(resolve => {
      const filePath = path.resolve(cache, id.toString(), postType)
      const fileName = path.resolve(filePath, imageName)
      if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true })
      const cacheStream = fs.createWriteStream(fileName)
      cacheStream.on('close', async () => {
        await this.saveImagePath(id, postType, imageName)
        await this.saveImageUrl(id, postType, imageName)
        resolve()
      })
      cacheStream.on('error', err => {})
      imageStream.pipe(cacheStream)
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
  async hasImageCached(id, postType) {
    const post = await this.findOne({ id })
    if (post === null) return false

    return !(post.$isEmpty(cache) || post[cache][postType].id === undefined)
  },
  async getCacheImageUrl(id, postType) {
    const post = await this.findOne({ id })
    if (post !== null && !post.$isEmpty(cache)) {
      const postObj = post.toObject()
      const type = postObj[cache][postType]
      const imageName =
        postObj[`${postType}_url`] !== undefined
          ? util.decodeImageName(
              postObj[`${postType}_url`].split('/').reverse()[0],
            )
          : type.url.split('/').reverse()[0]
      const imageUrl =
        type.url !== undefined
          ? type.url
          : await this.saveImageUrl(id, postType, imageName)
      if (type.path === undefined || !fs.existsSync(type.path)) {
        await this.saveImageToCache(
          global.$gfs.createReadStream({ _id: type.id }),
          id,
          postType,
          imageName,
        )
      }
      return `http://${global.$config.hostname}:${global.$config.port}/${imageUrl}`
    }
  },
  async getCover(tags) {
    const posts = await this.find({ tags: new RegExp(tags, 'i') })
    if (!_.isEmpty(posts)) {
      let postObj = posts[_.random(posts.length - 1)].toObject()
      delete postObj[cache]
      return postObj
    }
  },
  async removePost(id, postTypes) {
    const post = await this.findOne({ id })
    if (post === null) return

    if (!post.$isEmpty(cache)) {
      postTypes.forEach(postType => {
        const type = post[cache][postType]
        if (type !== undefined) {
          if (type.id !== undefined) global.$gfs.remove({ _id: type.id })
          post[cache][postType] = {}
        }
      })
      await post.save()
    }
  },
}

mongoose.model('Post', postSchema, 'posts')
