const express = require("express");
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
  reabrirVenta
} = require("../controllers/ventaProspecto.controller")

const verificarToken = require("../middlewares/authMiddleware");
const soloLectura = require("../middlewares/soloLectura");

const router = express.Router();


// Obtener todas las ventas de un prospecto específico
router.get("/prospecto/:id_prospecto", verificarToken, obtenerVentasPorProspecto);

//obtener ventas agrupadas
router.get("/prospecciones", obtenerProspeccionesAgrupadas);

// Obtener todas las ventas
router.get("/", verificarToken, obtenerVentas);

// Obtener una venta por ID
router.get("/:id_venta", verificarToken, obtenerVentaPorId);

// Crear una nueva venta para un prospecto
router.post("/", verificarToken,soloLectura, crearVenta);

// Cerrar una venta (cambiar estado a cerrada)
router.put("/:id_venta/cerrar", verificarToken,soloLectura, cerrarVenta);

// Eliminar una venta
router.delete("/:id_venta", verificarToken, soloLectura,eliminarVenta);

router.put("/:id_venta/reabrir", verificarToken, soloLectura, reabrirVenta);

router.put("/:id_venta/objetivo", verificarToken,soloLectura, editarObjetivoVenta);

router.put("/actualizar-monto", verificarToken,soloLectura, actualizarMontoCierre);

module.exports = router;
