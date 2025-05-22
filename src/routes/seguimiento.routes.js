const express = require("express");
const {
  obtenerSeguimientos,
  obtenerSeguimientoPorId,
  obtenerSeguimientosPorVendedora,
  obtenerAgendaPorVendedora,
  crearSeguimiento,
  registrarResultadoSeguimiento,  
  eliminarSeguimiento,
  obtenerHistorialPorVenta,
  obtenerTiposSeguimiento,
  exportarSeguimientos,
  obtenerAgendaGeneral,
  editarSeguimiento,
  crearSeguimientoConHoraAutomatica
} = require("../controllers/seguimientoVenta.controller");  

const verificarToken = require("../middlewares/authMiddleware");
const soloLectura = require("../middlewares/soloLectura");

const router = express.Router();

//exportar a excel 
router.get("/exportar", exportarSeguimientos); // Nueva ruta para exportación

//agenda
router.get("/agenda-general", verificarToken, obtenerAgendaGeneral);

// Obtener tipos de seguimiento
router.get("/tipos-seguimiento", obtenerTiposSeguimiento);

// Obtener la agenda de una vendedora (para el calendario)
router.get("/agenda/:cedula_vendedora", verificarToken, obtenerAgendaPorVendedora);

// Obtener historial de una venta específica
router.get("/venta/:id_venta", obtenerHistorialPorVenta);

// Obtener los seguimientos de una vendedora (para Admin)
router.get("/vendedora/:cedula_ruc", verificarToken, obtenerSeguimientosPorVendedora);


// Obtener todos los seguimientos
router.get("/", verificarToken, obtenerSeguimientos);

// Crear un nuevo seguimiento
router.post("/", verificarToken,soloLectura, crearSeguimiento);

// Crear un seguimiento con hora automática asignada
router.post("/auto", verificarToken, soloLectura, crearSeguimientoConHoraAutomatica);

//editar un seguimiento 
router.put("/:id_seguimiento/editar", verificarToken,soloLectura, editarSeguimiento);

// Obtener un seguimiento por su ID
router.get("/:id_seguimiento", verificarToken, obtenerSeguimientoPorId);

// Registrar resultado de un seguimiento (Actualizar estado)
router.put("/:id_seguimiento", verificarToken,soloLectura, registrarResultadoSeguimiento); 

// Eliminar un seguimiento
router.delete("/:id_seguimiento", verificarToken,soloLectura, eliminarSeguimiento);



module.exports = router;
