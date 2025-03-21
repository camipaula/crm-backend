const express = require("express");
const { obtenerDashboard } = require("../controllers/dashboard.controller");

const router = express.Router();

// Ruta para obtener los datos del dashboard
router.get("/", obtenerDashboard);

module.exports = router;
