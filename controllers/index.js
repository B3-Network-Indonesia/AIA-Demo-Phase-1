const { BlobServiceClient } = require("@azure/storage-blob");
const axios = require("axios");
const got = require("got");
const Queue = require("node-persistent-queue");
const q = new Queue(__dirname + "/db.sqlite", 20);

// // =================== QUEUE USING 'KUE REDIS' ==================
// const kue = require("kue");
// const queue = kue.createQueue({
//   // redis: {
//   //   host: "redis",
//   //   port: 6379,
//   // },
// });
// // // donwload and upload file running on queue
// queue.process("saveFile", (job, done) => {
//   try {
//     const { fileName, idx } = job.data.items;
//     const connectionString = process.env.CONNECTION_STRING;
//     const container = process.env.CONTAINER_NAME;
//     const secret = process.env.SECRET;
//     const data = got.stream(
//       `https://portal.hoiio.net/_o/v1/callRecordings/${fileName}?secret=${secret}`
//     );
//     // console.log(data);

//     const blobServiceClient =
//       BlobServiceClient.fromConnectionString(connectionString);

//     const blobName = `${idx}-${fileName}`;
//     const containerClient = blobServiceClient.getContainerClient(container);
//     const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//     const uploadBlobResponse = blockBlobClient.uploadStream(data);
//     console.log(uploadBlobResponse, new Date());
//     done(null, "finish");
//   } catch (error) {
//     console.log(error);
//     done(error);
//   }
// });

// // ================== QUEUE USING 'PRESISTEN QUEUE' ===================
q.on("next", (task) => {
  console.log("Queue contains " + q.getLength() + " job/s");
  console.log("Process task: ");
  console.log(task.job.fileName);
  try {
    const { fileName, idx } = task.job;
    const connectionString = process.env.CONNECTION_STRING;
    const container = process.env.CONTAINER_NAME;
    const secret = process.env.SECRET;
    const data = got.stream(
      `https://portal.hoiio.net/_o/v1/callRecordings/${fileName}?secret=${secret}`
    );

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    const blobName = `${idx}-${fileName}`;
    const containerClient = blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = blockBlobClient.uploadStream(data);
    console.log("success", new Date());
    q.done();
  } catch (error) {
    console.log(error);
    q.done(error);
  }
});
q.open().then(() => {
  q.start();
});

class Controller {
  static async saveAudio(req, res) {
    try {
      // // ============= queue using 'kue redis' ===============
      // const fileName = req.body.filename;
      // const idx = req.body.idx;
      // const job = queue.create("saveFile", {
      //   items: {
      //     fileName,
      //     idx,
      //   },
      // });
      // job.on("failed", (err) => {
      //   throw new Error(err);
      // });
      // job.on("complete", (result) => {
      //   console.log("complete");
      // });
      // job.save();

      // console.log("success", new Date());
      // res.status(200).json({
      //   message: "success add to queue",
      // });

      // // ===================== queue using 'node-persistent-queue' ===============
      const task = {
        fileName: req.body.filename,
        idx: req.body.idx,
      };
      q.open().then(() => {
        q.add(task);
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
// // uncomment this section to doing concurent test
// // =================================================

// const doTest = async (idx) => {
//   const { data } = await axios({
//     method: "POST",
//     url: "http://localhost:5000/save-audio",
//     data: {
//       orgUuid: "ef1eb1d3-a884-474f-9f68-74bd6ea5a83e",
//       txnUuid: "3069128a-ed39-4a28-a8b8-5c0c031a4673",
//       filename:
//         "20210521_062013_100_6281210794432_3069128a-ed39-4a28-a8b8-5c0c031a4673.mp3",
//       webhookCode: "callRecording",
//       idx,
//     },
//   });
//   console.log(`Transaction id #${idx}`, data);
// };
// Promise.all([doTest(1), doTest(2), doTest(3), doTest(4)]);

module.exports = Controller;
