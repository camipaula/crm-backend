const express = require("express");
const verificarToken = require("../middlewares/authMiddleware");
const { obtenerDashboard } = require("../controllers/dashboard.controller");
const { obtenerDashboardMetas } = require("../controllers/dashboardMetas.controller");
const { obtenerMetasComparacion } = require("../controllers/dashboardMetasComparacion.controller");

const router = express.Router();

// Dashboard principal (ventas, prospectos, etc.)
router.get("/", obtenerDashboard);

// Dashboard de metas (forecast) - KPIs solo metas
router.get("/metas", verificarToken, obtenerDashboardMetas);

// Dashboard meta vs real (match, solo_meta, solo_real_externa)
router.get("/metas-comparacion", verificarToken, obtenerMetasComparacion);

module.exports = router;
