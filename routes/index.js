const Controller = require("../controllers");
const express = require("express");
const router = express.Router();

router.post("/save-audio", Controller.saveAudio);

module.exports = router;
