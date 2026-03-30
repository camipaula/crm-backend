const express = require("express");
const verificarToken = require("../middlewares/authMiddleware");
const {
  createForecast,
  updateForecast,
  getForecastByMonth,
  getForecastByYear,
  getForecastBySeller,
  listarForecasts,
  upsertForecastsBulk,
} = require("../controllers/forecast.controller");

const router = express.Router();

const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== "admin") {
    return res.status(403).json({ message: "Solo administración puede gestionar el forecast." });
  }
  next();
};

router.put("/bulk", upsertForecastsBulk);
// Rutas específicas primero (para que no se confundan con :id_forecast)
router.get("/vendedora/:cedula_vendedora", verificarToken, getForecastBySeller);
router.get("/mes", verificarToken, getForecastByMonth);
router.get("/anio", verificarToken, getForecastByYear);

// Listar con filtros opcionales (anio, mes, cedula_vendedora)
router.get("/", verificarToken, listarForecasts);

// Crear y actualizar solo admin
router.post("/", verificarToken, soloAdmin, createForecast);
router.put("/:id_forecast", verificarToken, soloAdmin, updateForecast);

module.exports = router;
