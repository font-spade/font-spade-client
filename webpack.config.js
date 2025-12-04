module.exports = {
  resolve: {
    fallback: {
      "canvas": false,
      "jsdom": false,
      "fs": false,
      "path": false,
      "stream": false,
      "buffer": false,
      "crypto": false,
      "os": false,
      "url": false,
      "assert": false,
      "util": false,
      "bufferutil": false,
      "utf-8-validate": false
    }
  },
  externals: {
    canvas: "canvas",
    bufferutil: "bufferutil",
    "utf-8-validate": "utf-8-validate"
  }
};
