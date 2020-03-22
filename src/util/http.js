const axios = require('axios')
const download = require('download')

class Http {
  constructor(baseURL, timeout = 60000) {
    this.baseURL = baseURL
    this.timeout = timeout
    this._init()
  }

  _init() {
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
    })
    this.http.interceptors.response.use(res => res.data)
  }

  async get(url, params, timeout = this.timeout) {
    return await this.http.get(url, { params, timeout })
  }

  async post(url, data, timeout = this.timeout) {
    return await this.http.post(url, data, { timeout })
  }

  download(uri) {
    return download(uri)
  }
}

module.exports = Http
