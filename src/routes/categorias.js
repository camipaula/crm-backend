const express = require("express");
const { obtenerCategorias } = require("../controllers/categoria.controller");

const router = express.Router();

router.get("/", obtenerCategorias);

module.exports = router;
