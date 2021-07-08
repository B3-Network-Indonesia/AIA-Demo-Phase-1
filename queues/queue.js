const { fileHash } = require("../helpers");
const { BlobServiceClient } = require("@azure/storage-blob");
const Stream = require("stream");
const axios = require("axios");
const Queue = require("node-persistent-queue");
const queue = new Queue("./db/db.sqlite", 1);

queue.open().then(() => {
  queue.start();
});

queue.on("next", (task) => {
  console.log("Queue contains " + queue.getLength() + " job/s");
  const { fileKey } = task.job;
  const connectionString = process.env.CONNECTION_STRING;
  const container = process.env.CONTAINER_NAME;
  const secret = process.env.SECRET;

  const writeSource = new Stream.PassThrough();
  let digest;
  // download audio file
  axios({
    method: "GET",
    url: `https://portal.spidergate.com.sg/_o/v2/files/${fileKey}?secret=${secret}`,
    responseType: "stream",
  })
    .then((response) => {
      digest = response.headers.digest;
      response.data.pipe(writeSource);
      // generate digest
      return fileHash(response.data);
    })
    .then((result) => {
      // integrity verification
      if (result === digest) {
        // if checksum succesful, upload file to azure storage
        const blobServiceClient =
          BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(container);
        const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
        return blockBlobClient.uploadStream(writeSource);
      } else {
        // if checksum failed, queuing the job again
        queue.add({
          fileKey,
        });
        queue.done();
      }
    })
    .then(() => {
      queue.done();
    })
    .catch((error) => {
      // need open api to consume error logs
      console.log(error, "<=== download error");
      queue.add({
        fileKey,
      });
      queue.done();
    });
});

queue.on("empty", () => {
  console.log("empty");
});

module.exports = queue;
