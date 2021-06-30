const Controller = require("../controllers");
const express = require("express");
const router = express.Router();

// router.get("/", (req, res) => {
//   res.send("Connection OK");
// });

router.post("/save-audio", Controller.saveAudio);

module.exports = router;
