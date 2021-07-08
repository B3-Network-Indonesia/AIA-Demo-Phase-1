const crypto = require("crypto");

module.exports = (file) => {
  return new Promise((resolve, reject) => {
    file
      .pipe(crypto.createHash("sha256").setEncoding("base64"))
      .on("error", (err) => reject(err))
      .on("finish", function () {
        resolve(`sha256=${this.read("base64")}`);
      });
  });
};
