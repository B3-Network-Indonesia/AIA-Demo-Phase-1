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
  const { fileKey } = task.job;
  const connectionString = process.env.CONNECTION_STRING;
  const container = process.env.CONTAINER_NAME;
  const secret = process.env.SECRET;

  let readStream1;
  let readStream2;
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
      readStream1 = new ReadableStreamClone(response.data);
      readStream2 = new ReadableStreamClone(response.data);
      return createHash(readStream2);
    })
    .then((result) => {
      // integrity verification
      console.log(result, "<== after hash");
      if (result === digest) {
        return decryptFile(readStream1);
      } else {
        queue.add({
          fileKey,
        });
        queue.done();
      }
    })
    .then((result) => {
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(container);
      const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
      return blockBlobClient.uploadStream(result);
    })
    .then(() => {
      console.log("ini");
      queue.done();
    })
    .catch((error) => {
      // need open api to consume error logs
      console.log(error, "<=== download error");
      // queue.add({
      //   fileKey,
      // });
      queue.done();
    });
});

queue.on("empty", () => {
  console.log("empty");
});

module.exports = queue;

// {
//   "fileKey": "recordings/2021-07-09/20210709_025449_100_6282134063355_3ee68260-9e81-4d9b-bbc6-cd0d5c4fde31.mp3",
//   "orgUuid": "ef1eb1d3-a884-474f-9f68-74bd6ea5a83e",
//   "txnUuid": "3ee68260-9e81-4d9b-bbc6-cd0d5c4fde31",
//   "webhookCode": "callRecordingV2"
//   }
