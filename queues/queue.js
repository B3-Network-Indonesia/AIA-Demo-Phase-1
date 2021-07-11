const { createHash, decryptFile } = require("../helpers");
const { BlobServiceClient } = require("@azure/storage-blob");
const ReadableStreamClone = require("readable-stream-clone");
const axios = require("axios");
const Queue = require("node-persistent-queue");
const queue = new Queue("./db/db.sqlite", 1);
const fs = require("fs");
const path = require("path");

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
      return createHash(cloneStream2);
    })
    .then((result) => {
      // integrity verification

      if (result === digest) {
        return decryptFile(cloneStream1);
      } else {
        throw new Error("Checksum failed");
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
          .then(({ data }) => {
            errId++;
            queue.done();
          })
          .catch((err) => {
            const payload = {
              date: new Date(),
              fileKey,
              orgUuid,
              txnUuid,
              errorMessage: error.message,
            };
            let currentData = fs.readFileSync(
              path.resolve(__dirname, "../logs.json"),
              "utf-8"
            );

            currentData = JSON.parse(currentData);
            currentData.unshift(payload);

            fs.writeFileSync(
              path.resolve(__dirname, "../logs.json"),
              JSON.stringify(currentData, null, 2)
            );
            queue.done();
          });
      }
    });
});

queue.on("empty", () => {
  console.log("empty");
});

module.exports = queue;
