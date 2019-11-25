const fs = require('fs')
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const api = require('../api')
const util = require('../util/util')

const cache = global.$config.cache
const useCache = global.$config.useCache
const useMongoDB = global.$config.useMongoDB
const Post = useMongoDB ? mongoose.model('Post') : null
const postRouter = express.Router()
const routeName = '/post'

postRouter
  .route(routeName)
  .get(async (req, res) => {
    const result = await api.get(
      `${routeName}.json${util.toQueryString(req.query)}`,
    )

    if (useCache && useMongoDB) {
      Post.synchronizePosts(result)
      res.json(await _downloadImages(result))
    } else if (useCache && !useMongoDB) {
      res.json(await _downloadImages(result))
    } else if (!useCache && useMongoDB) {
    } else return result
  })
  .post(async (req, res) => {
    const result = await api.post(`${routeName}.json`, req.body)
  })

async function _downloadImages(posts) {
  return await Promise.all(
    posts.map(async post => {
      await _downloadImage(post, 'preview')
      await _downloadImage(post, 'sample')
      await _downloadImage(post, 'jpeg')
      await _downloadImage(post, 'file')

      return post
    }),
  )
}

async function _downloadImage(post, postType) {
  const id = post.id
  const url = post[`${postType}_url`]
  const imageName = url.split('/').reverse()[0]
  if (useMongoDB) {
    if (await Post.hasImageDownloaded(id, postType)) {
      const cacheUrl = await Post.getCacheImageUrl(id, postType)
      if (cacheUrl !== undefined) {
        if (post[cache] === undefined) post[cache] = {}
        post[cache][postType] = cacheUrl
      }
    } else Post.saveImage(api.download(url), id, postType, imageName)
  } else {
    if (_hasImageDownloaded(id, postType, imageName)) {
      const cacheUrl = _getCacheImageUrl(id, postType, imageName)
      if (post[cache] === undefined) post[cache] = {}
      post[cache][postType] = cacheUrl
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
  fs.createWriteStream(fileName).end(await util.getRawBody(imageStream))
}

module.exports = postRouter
