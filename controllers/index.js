const { BlobServiceClient } = require("@azure/storage-blob");
const got = require("got");

class Controller {
  static async saveAudio(req, res, next) {
    try {
      const fileName = req.body.filename;
      const connectionString = process.env.CONNECTION_STRING;
      const container = process.env.CONTAINER_NAME;
      const secret = process.env.SECRET;
      const data = got.stream(
        `https://portal.hoiio.net/_o/v1/callRecordings/${fileName}?secret=${secret}`
      );

      const blobServiceClient = await BlobServiceClient.fromConnectionString(
        connectionString
      );

      const containerClient = await blobServiceClient.getContainerClient(
        container
      );
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      const uploadBlobResponse = await blockBlobClient.uploadStream(data);
      res.status(200).json(uploadBlobResponse);
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
}

module.exports = Controller;
