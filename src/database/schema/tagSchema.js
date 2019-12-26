const mongoose = require('mongoose')
const util = require('../../util/util')

const expired = global.$config.expired

const tagSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    count: Number,
    type: Number,
    ambiguous: Boolean,
    operate_time: Number,
  },
  { id: false },
)

tagSchema.statics = {
  insertTags(tags) {
    if (!(tags instanceof Array)) return

    tags.forEach(async tag => {
      if (!(await this.isTagExists(tag.id))) {
        tag.operate_time = Date.now()
        await this.create(tag)
      } else if (await this.isTagExpired(tag.id)) {
        tag.operate_time = Date.now()
        await this.updateOne({ id: tag.id }, tag)
      }
    })
  },
  async isTagExists(id) {
    return await this.exists({ id })
  },
  async isTagExpired(id) {
    if (!expired.enable) return true

    const tag = await this.findOne({ id })
    if (tag === null) return false

    return (
      Date.now() - tag.operate_time >
      util.getTimestamp(expired.time, expired.unit)
    )
  },
  async getTag(name) {
    return await this.findOne({ name })
  },
}

mongoose.model('Tag', tagSchema, 'tags')
