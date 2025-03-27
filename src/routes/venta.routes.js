const express = require("express");
const {
  obtenerVentas,
  obtenerVentasPorProspecto,
  obtenerVentaPorId,
  crearVenta,
  cerrarVenta,
  eliminarVenta,
  editarObjetivoVenta,
  obtenerProspeccionesAgrupadas
} = require("../controllers/ventaProspecto.controller")

const verificarToken = require("../middlewares/authMiddleware");

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
router.post("/", verificarToken, crearVenta);

// Cerrar una venta (cambiar estado a cerrada)
router.put("/:id_venta/cerrar", verificarToken, cerrarVenta);

// Eliminar una venta
router.delete("/:id_venta", verificarToken, eliminarVenta);

router.put("/:id_venta/objetivo", verificarToken, editarObjetivoVenta);

module.exports = router;
