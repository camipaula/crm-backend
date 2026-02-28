const express = require("express");
const verificarToken = require("../middlewares/authMiddleware");
const { listarCategoriasVenta } = require("../controllers/categoriaVenta.controller");

const router = express.Router();

router.get("/", verificarToken, listarCategoriasVenta);

module.exports = router;
