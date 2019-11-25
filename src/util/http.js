const axios = require('axios')
const download = require('download')

class Http {
  constructor(baseURL, timeout = 60000) {
    this.baseURL = baseURL
    this.timeout = 60000
    this._init()
  }

  _init() {
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
    this.http.interceptors.response.use(res => res.data)
  }

  async get(url, params) {
    return await this.http.get(url, { params })
  }

  async post(url, data) {
    return await this.http.post(url, data)
  }

  download(uri) {
    return download(uri)
  }
}

module.exports = Http
