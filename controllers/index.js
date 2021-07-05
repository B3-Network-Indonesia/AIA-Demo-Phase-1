const fileHash = require("../helpers");
const { BlobServiceClient } = require("@azure/storage-blob");
const Stream = require("stream");
const Queue = require("node-persistent-queue");
const queue = new Queue("./db/db.sqlite", 1);
const axios = require("axios");

queue.on("empty", () => {
  console.log("empty");
});

// run queue job
queue.on("next", (task) => {
  console.log("Queue contains " + queue.getLength() + " job/s");
  console.log("Process task: ");
  const { fileKey } = task.job;
  const connectionString = process.env.CONNECTION_STRING;
  const container = process.env.CONTAINER_NAME;
  const secret = process.env.SECRET;

  const uploadFile = () => {
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
          // upload file to azure storage
          const blobServiceClient =
            BlobServiceClient.fromConnectionString(connectionString);
          const containerClient =
            blobServiceClient.getContainerClient(container);
          const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
          return blockBlobClient.uploadStream(writeSource);
        } else {
          // repeat download if verification not pass
          uploadFile();
        }
      })
      .then((result) => {
        console.log(result, "<=== response from azure");
        queue.done();
      })
      .catch((error) => {
        // send log error to open api or create alert
        console.log(error, "<=== download error");
        queue.done();
      });
  };
  uploadFile();
});

// open connetion to queue and then start
queue.open().then(() => {
  queue.start();
});

class Controller {
  static async saveAudio(req, res) {
    try {
      const task = {
        fileKey: req.body.fileKey,
      };
      queue.open().then(() => {
        queue.add(task);
      });
      console.log("response", new Date());
      res.send("success add queue");
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
}

// // =================================================
// // uncomment this section to doing concurrent test
// // =================================================

// const doTest = async (idx) => {
//   const { data } = await axios({
//     method: "POST",
//     url: "http://localhost:5000/save-audio",
//     data: {
//       fileKey:
//         "recordings/2021-07-02/20210702_073428_100_6281210794432_57deaee3-a774-4938-8875-3ad8f4c90dc7.mp3",
//       orgUuid: "ef1eb1d3-a884-474f-9f68-74bd6ea5a83e",
//       txnUuid: "57deaee3-a774-4938-8875-3ad8f4c90dc7",
//       webhookCode: "callRecordingV2",
//     },
//   });
//   console.log(`Transaction id #${idx}`, data);
// };
// Promise.all([doTest(1), doTest(2), doTest(3), doTest(4)]);

module.exports = Controller;
