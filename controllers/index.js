const { queue } = require("../queues");

module.exports = class Controller {
  static saveAudio(req, res) {
    queue
      .add({
        fileKey: req.body.fileKey,
        orgUuid: req.body.orgUuid,
        txnUuid: req.body.txnUuid,
        retry: 1,
      })
      .then(() => {
        res.status(200).json({
          message: "Success add job to queue",
        });
      })
      .catch(() => {
        res.status(500).json({
          message: "Failed add job to queue",
        });
      });
  }
};
