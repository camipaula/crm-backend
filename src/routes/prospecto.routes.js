const express = require("express");
const {
  obtenerProspectos,
  obtenerProspectoPorId,
  obtenerProspectosPorVendedora,
  obtenerProspectosPorEstado,
  crearProspecto,
  actualizarProspecto,
  eliminarProspecto,
  obtenerSectores
} = require("../controllers/prospecto.controller");

const verificarToken = require("../middlewares/authMiddleware");

const router = express.Router();

// Obtener todos los sectores únicos de los prospectos
router.get("/sectores", verificarToken, obtenerSectores);

// Obtener todos los prospectos con filtros opcionales
router.get("/", verificarToken, obtenerProspectos);

// Obtener prospectos de una vendedora
router.get("/vendedora/:cedula_vendedora", verificarToken, obtenerProspectosPorVendedora);

// Obtener prospectos por estado
router.get("/estado/:estado", verificarToken, obtenerProspectosPorEstado);

// Obtener un prospecto por ID
router.get("/:id_prospecto", verificarToken, obtenerProspectoPorId);

// Crear un nuevo prospecto
router.post("/", verificarToken, crearProspecto);

// Actualizar un prospecto por ID
router.put("/:id_prospecto", verificarToken, actualizarProspecto);

// Eliminar un prospecto por ID
router.delete("/:id_prospecto", verificarToken, eliminarProspecto);

module.exports = router;
