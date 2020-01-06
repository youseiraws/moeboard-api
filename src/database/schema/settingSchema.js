const mongoose = require('mongoose')

const Mixed = mongoose.Schema.Types.Mixed

const settingSchema = new mongoose.Schema(
  {
    name: String,
    value: Mixed,
  },
  { id: false },
)

settingSchema.statics = {
  async updateSetting(name, value) {
    this.update({ name }, { name, value }, { upsert: true })
  },
  async getSettings() {
    return await this.find()
  },
}

mongoose.model('Setting', settingSchema, 'settings')
