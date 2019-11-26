const fs = require('fs')
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const api = require('../api')
const util = require('../util/util')

const cache = global.$config.cache
const useCache = global.$config.useCache
const useMongoDB = global.$config.useMongoDB
const cachePostTypes = global.$config.cachePostTypes
const Post = useMongoDB ? mongoose.model('Post') : null
const postRouter = express.Router()
const routeName = '/post'

postRouter
  .route(routeName)
  .get(async (req, res) => {
    const result = _toWhiteSpace(
      await api.get(`${routeName}.json${util.toQueryString(req.query)}`),
    )
    await _handleRequest(result, res)
  })
  .post(async (req, res) => {
    const result = _toWhiteSpace(await api.post(`${routeName}.json`, req.body))
    await _handleRequest(result, res)
  })

function _toWhiteSpace(posts) {
  return posts.map(post => {
    return Object.assign(
      {},
      post,
      cachePostTypes.map(postType => ({
        [`${postType}_url`]: post[`${postType}_url`].replace(/%20/g, ' '),
      })),
    )
  })
}

async function _handleRequest(result, res) {
  let posts = Object.assign({}, result)
  if (useCache) posts = await _downloadImages(result)
  res.json(posts)
  if (useMongoDB) Post.insertPosts(result)
}

async function _downloadImages(posts) {
  return await Promise.all(
    posts.map(async post => {
      await Promise.all(
        cachePostTypes.map(async postType => {
          const cacheUrl = await _downloadImage(
            post.id,
            postType,
            post[`${postType}_url`],
            post[cache],
          )
          if (cacheUrl !== undefined) {
            if (post[cache] === undefined) post[cache] = {}
            post[cache][postType] = cacheUrl
          }
        }),
      )
      return post
    }),
  )
}

async function _downloadImage(id, postType, url) {
  const imageName = url.split('/').reverse()[0]
  if (useMongoDB) {
    if (await Post.hasImageDownloaded(id, postType)) {
      return await Post.getCacheImageUrl(id, postType)
    } else Post.saveImage(api.download(url), id, postType, imageName)
  } else {
    if (_hasImageDownloaded(id, postType, imageName)) {
      return _getCacheImageUrl(id, postType, imageName)
    } else _saveImage(api.download(url), id, postType, imageName)
  }
}

function _hasImageDownloaded(id, postType, imageName) {
  return fs.existsSync(path.resolve(cache, id.toString(), postType, imageName))
}

function _getCacheImageUrl(id, postType, imageName) {
  const imageUrl = [id.toString(), postType, imageName].join('/')
  return `http://${global.$config.hostname}:${global.$config.port}/${imageUrl}`
}

async function _saveImage(imageStream, id, postType, imageName) {
  const filePath = path.resolve(cache, id.toString(), postType)
  const fileName = path.resolve(filePath, imageName)
  if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true })
  imageStream.pipe(fs.createWriteStream(fileName))
}

module.exports = postRouter
