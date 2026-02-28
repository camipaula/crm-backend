const express = require("express");
const upload = require("../middlewares/upload");
const verificarToken = require("../middlewares/authMiddleware");
const soloLectura = require("../middlewares/soloLectura");
const {
  subirDocumento,
  listarDocumentos,
  opcionesAlcance,
  descargarArchivo,
  eliminarDocumento,
} = require("../controllers/documento.controller");

const router = express.Router();

router.get("/opciones", verificarToken, opcionesAlcance);
router.get("/", verificarToken, listarDocumentos);
router.get("/:id/archivo", verificarToken, descargarArchivo);
router.post("/", verificarToken, soloLectura, upload.single("archivo"), subirDocumento);
router.delete("/:id", verificarToken, soloLectura, eliminarDocumento);

module.exports = router;
