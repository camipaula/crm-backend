const express = require("express");
const verificarToken = require("../middlewares/authMiddleware");
const { listarAccesos, listarActividades } = require("../controllers/logs.controller");

const router = express.Router();

const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== "admin") {
    return res.status(403).json({ message: "Solo administración puede ver los logs." });
  }
  next();
};

router.get("/acceso", verificarToken, soloAdmin, listarAccesos);
router.get("/actividad", verificarToken, soloAdmin, listarActividades);

module.exports = router;
