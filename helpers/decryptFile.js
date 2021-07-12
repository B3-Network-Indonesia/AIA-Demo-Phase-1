const fs = require("fs");
const openpgp = require("openpgp");
const path = require("path");

const privateKeyArmored = fs.readFileSync(
  path.resolve(__dirname, "../privatekey.asc"),
  "utf-8"
);

const passphrase = process.env.PASSPHRASE;

openpgp.config.allow_insecure_decryption_with_signing_keys = true;

module.exports = (file) => {
  return new Promise((resolve, reject) => {
    let privateKey;
    openpgp.key
      .readArmored([privateKeyArmored])
      .then((result) => {
        privateKey = result.keys[0];
        return privateKey.decrypt(passphrase);
      })
      .then(() => {
        return openpgp.message.readArmored(file);
      })
      .then((result) => {
        return openpgp.decrypt({
          message: result,
          privateKeys: [privateKey],
          format: "binary",
        });
      })
      .then((result) => {
        resolve(result.data);
      })
      .catch((err) => {
        reject({
          message: "Decrypt file failed",
        });
      });
  });
};
