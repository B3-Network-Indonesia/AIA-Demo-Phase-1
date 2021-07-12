const { createHash, decryptFile, logger } = require("../helpers");
const { BlobServiceClient } = require("@azure/storage-blob");
const ReadableStreamClone = require("readable-stream-clone");
const axios = require("axios");
const Queue = require("node-persistent-queue");
const queue = new Queue("./db/db.sqlite", 1);
let errId = 1;

queue.open().then(() => {
  queue.start();
});

queue.on("next", (task) => {
  let { fileKey, orgUuid, txnUuid, retry } = task.job;
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

      cloneStream1 = new ReadableStreamClone(response.data);
      cloneStream2 = new ReadableStreamClone(response.data);
      // create chekcsum digest
      return createHash(cloneStream2);
    })
    .then((result) => {
      // integrity verification
      if (result === digest) {
        // decrypt file
        return decryptFile(cloneStream1);
      } else {
        throw new Error("Checksum failed");
      }
    })
    .then((result) => {
      // upload file to azure blob storage
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(container);
      const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
      return blockBlobClient.uploadStream(result);
    })
    .then(() => {
      queue.done();
    })
    .catch((error) => {
      if (retry <= 3) {
        setTimeout(() => {
          queue.add({
            fileKey,
            fileKey,
            orgUuid,
            txnUuid,
            retry: retry + 1,
          });
          queue.done();
        }, 10000);
      } else {
        axios({
          method: "POST",
          url: "https://oqxnp4g8db.execute-api.ap-southeast-1.amazonaws.com/dev/api/log",
          data: {
            fileKey,
            orgUuid,
            txnUuid,
            errorMessage: error.message,
            id: errId,
          },
        })
          .then(() => {
            errId++;
            queue.done();
          })
          .catch((err) => {
            const errorMessage = error.message;
            let data = {
              fileKey,
              orgUuid,
              txnUuid,
              id: errId,
            };
            let payload = JSON.stringify(data);
            logger.error(`- :: - ${errorMessage} - ${payload}`);
            errId++;
            queue.done();
          });
      }
    });
});

queue.on("empty", () => {
  console.log("empty");
});

module.exports = queue;
