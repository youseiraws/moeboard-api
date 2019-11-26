module.exports = {
  port: 3000, // 端口号
  hostname: 'localhost', //主机名
  source: 'konachan', // 图片源，可选值：konachan;
  useCache: true, // 是否启用图片缓存
  useMongoDB: true, // 是否启用MongoDB
  // 需要缓存的图片类型，可选值：preview;sample;jpeg;file. 图片质量依次提高
  cachePostTypes: ['preview', 'sample', 'jpeg', 'file'],
  mongoDBUri: 'mongodb://localhost:27017/', // MongoDB地址
  // 数据时限设置
  expired: {
    enable: true, // 是否启用
    unit: 'day', // 时限单位，可选值：second;minute;hour;day
    time: 15, // 时限时长
  },
  cache: 'storage', // 图片缓存文件夹名称
}
