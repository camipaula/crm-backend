const express = require("express");
const verificarToken = require("../middlewares/authMiddleware");
const { obtenerDashboardMetas } = require("../controllers/dashboardMetas.controller");

const router = express.Router();

// GET /api/dashboard-metas?anio=2026&mes=1 (alternativa a /api/dashboard/metas)
router.get("/", verificarToken, obtenerDashboardMetas);

module.exports = router;
