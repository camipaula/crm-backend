const express = require("express");
const router = express.Router();
const { obtenerIndicadores } = require("../controllers/indicadores.controller");

// Tu middleware de validación de token (ajusta el path si es necesario)
const verificarToken = require("../middlewares/authMiddleware");

// Ruta: GET /api/indicadores
router.get("/", verificarToken, obtenerIndicadores);

module.exports = router;