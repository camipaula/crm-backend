const express = require("express");

// 1. Importaciones del CRM interno
const {
  obtenerVentas,
  obtenerVentasPorProspecto,
  obtenerVentaPorId,
  crearVenta,
  cerrarVenta,
  eliminarVenta,
  editarObjetivoVenta,
  obtenerProspeccionesAgrupadas,
  actualizarMontoCierre,
  reabrirVenta,
} = require("../controllers/ventaProspecto.controller");

// 2. Importaciones de la API externa y Matches
const { 
  sincronizarVentasReales,
  hacerMatchVendedora,
  obtenerCodigosExternos,
  obtenerMatchesVendedoras
} = require("../controllers/ventaRealMensual.controller");

const verificarToken = require("../middlewares/authMiddleware");
const soloLectura = require("../middlewares/soloLectura");

const router = express.Router();

// --- RUTAS DE MATCH Y EXTERNAS ---
router.get("/codigos-externos", verificarToken, soloLectura, obtenerCodigosExternos);
router.get("/matches-vendedoras", verificarToken, soloLectura, obtenerMatchesVendedoras);
router.post("/sincronizar", verificarToken, soloLectura, sincronizarVentasReales);
router.post("/match-vendedora", verificarToken, soloLectura, hacerMatchVendedora);

// --- RUTAS DEL CRM INTERNO ---
router.get("/prospecto/:id_prospecto", verificarToken, obtenerVentasPorProspecto);
router.get("/prospecciones", verificarToken, obtenerProspeccionesAgrupadas); // Agregué verificarToken por seguridad
router.get("/", verificarToken, obtenerVentas);
router.get("/:id_venta", verificarToken, obtenerVentaPorId);
router.post("/", verificarToken, soloLectura, crearVenta);
router.put("/:id_venta/cerrar", verificarToken, soloLectura, cerrarVenta);
router.delete("/:id_venta", verificarToken, soloLectura, eliminarVenta);
router.put("/:id_venta/reabrir", verificarToken, soloLectura, reabrirVenta);
router.put("/:id_venta/objetivo", verificarToken, soloLectura, editarObjetivoVenta);
router.put("/actualizar-monto", verificarToken, soloLectura, actualizarMontoCierre);

module.exports = router;