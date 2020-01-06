const mongoose = require('mongoose')

const Post = mongoose.model('Post')
const Tag = mongoose.model('Tag')
const BLACKLIST = '黑名单'
const TAG_MANAGEMENT = '标签管理'

const collectionSchema = new mongoose.Schema(
  {
    name: String,
    posts: Array,
    tags: Array,
  },
  { id: false },
)

collectionSchema.statics = {
  async addCollection(name) {
    if (!(await this.isCollectionExists(name)))
      return await this.create({
        name,
        posts: [],
      })
  },
  async editCollection(oldName, newName) {
    const collection = await this.findOne({ name: oldName })
    if (collection === null) return
    collection.name = newName
    await collection.save()
  },
  async removeCollection(name) {
    await this.deleteOne({ name })
  },
  async isCollectionExists(name) {
    return await this.exists({ name })
  },
  async getCollections() {
    const collections = await this.find()
    return await Promise.all(
      collections.map(async collection => {
        if (collection.name === TAG_MANAGEMENT)
          await Promise.all(
            collection.tags.map(async id => {
              const tag = await Tag.findOne({ id })
              if (tag !== null) return tag
            }),
          )
        else
          await Promise.all(
            collection.posts.map(async (id, index, arr) => {
              const post = await Post.findOne({ id })
              if (post !== null) arr.splice(index, 1, post.toObject())
            }),
          )
        return collection
      }),
    )
  },
  async like(name, id) {
    const collection = await this.findOne({ name })
    if (collection === null) return
    if (collection.posts.includes(parseInt(id))) return
    collection.posts.push(parseInt(id))
    await collection.save()
  },
  async dislike(name, id) {
    const collection = await this.findOne({ name })
    if (collection === null) return
    collection.posts = collection.posts.filter(post => post !== parseInt(id))
    await collection.save()
  },
  async black(id) {
    let collection = await this.findOne({ name: BLACKLIST })
    if (collection === null) collection = await this.addCollection(BLACKLIST)
    if (collection.posts.includes(parseInt(id))) return
    collection.posts.push(parseInt(id))
    await collection.save()
  },
  async unblack(id) {
    let collection = await this.findOne({ name: BLACKLIST })
    if (collection === null) collection = await this.addCollection(BLACKLIST)
    collection.posts = collection.posts.filter(post => post !== parseInt(id))
    await collection.save()
  },
  async tag(id) {
    let collection = await this.findOne({ name: TAG_MANAGEMENT })
    if (collection === null)
      collection = await this.addCollection(TAG_MANAGEMENT)
    if (collection.tags.includes(parseInt(id))) return
    collection.tags.push(parseInt(id))
    await collection.save()
  },
  async untag(id) {
    let collection = await this.findOne({ name: TAG_MANAGEMENT })
    if (collection === null)
      collection = await this.addCollection(TAG_MANAGEMENT)
    collection.tags = collection.tags.filter(tag => tag !== parseInt(id))
    await collection.save()
  },
}

mongoose.model('Collection', collectionSchema, 'collections')
