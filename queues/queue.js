const { createHash, decryptFile } = require("../helpers");
const { BlobServiceClient } = require("@azure/storage-blob");
const ReadableStreamClone = require("readable-stream-clone");
const axios = require("axios");
const Queue = require("node-persistent-queue");
const queue = new Queue("./db/db.sqlite", 1);

queue.open().then(() => {
  queue.start();
});

queue.on("next", (task) => {
  console.log("Queue contains " + queue.getLength() + " job/s");
  let { fileKey, retry } = task.job;
  const connectionString = process.env.CONNECTION_STRING;
  const container = process.env.CONTAINER_NAME;
  const secret = process.env.SECRET;

  let cloneStream1;
  let cloneStream2;
  let digest;
  // download audio file
  axios({
    method: "GET",
    url: `https://portal.hoiio.net/_o/v2/files/${fileKey}?secret=${secret}`,
    responseType: "stream",
  })
    .then((response) => {
      digest = response.headers.digest;
      console.log(digest, "<== from B3");
      cloneStream1 = new ReadableStreamClone(response.data);
      cloneStream2 = new ReadableStreamClone(response.data);
      return createHash(cloneStream2);
    })
    .then((result) => {
      // integrity verification
      console.log(result, "<== after hash");
      if (result === digest) {
        return decryptFile(cloneStream1);
      } else {
        throw new Error("Checksum failed");
      }
    })
    .then((result) => {
      console.log("upload azure");
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(container);
      const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
      return blockBlobClient.uploadStream(result);
    })
    .then(() => {
      console.log("done");
      queue.done();
    })
    .catch((error) => {
      // need open api to consume error logs
      console.log(error.message, "<=== download error");
      if (error.message === "Checksum failed") {
        // queue again
        // if more than 5, send alert
        console.log("Cheksum not succuess");
        if (retry <= 5) {
          console.log(retry, "<== retry");
          setTimeout(() => {
            queue.add({
              fileKey,
              retry: retry + 1,
            });
            queue.done();
          }, 2000);
        } else {
          console.log(retry, "finish and send alert");
          queue.done();
        }
      } else if (error.message === "Decrypt failed") {
        // queue again
        // if more than 5, send alert
        console.log("Decrypt not success");
        if (retry <= 5) {
          console.log(retry, "<== retry");
          setTimeout(() => {
            queue.add({
              fileKey,
              retry: retry + 1,
            });
            queue.done();
          }, 2000);
        } else {
          console.log(retry, "finish and send alert");
          queue.done();
        }
      } else {
        // if more than 5, send alert
        console.log(error.message);
        console.log("send alert");
        queue.done();
      }
    });
});

queue.on("empty", () => {
  console.log("empty");
});

module.exports = queue;
