const express = require("express");
const upload = require("../middlewares/upload");

const {
  obtenerProspectos,
  obtenerProspectoPorId,
  obtenerProspectosPorVendedora,
  obtenerProspectosPorEstado,
  crearProspecto,
  actualizarProspecto,
  eliminarProspecto,
  obtenerSectores,
  obtenerProspectosPorCategoria,
  exportarProspectos
} = require("../controllers/prospecto.controller");

const verificarToken = require("../middlewares/authMiddleware");

const router = express.Router();
//Exportar a excel
router.get("/exportar", verificarToken, exportarProspectos);

// Obtener todos los sectores únicos de los prospectos
router.get("/sectores", verificarToken, obtenerSectores);


// Obtener todos los prospectos con filtros opcionales
router.get("/", verificarToken, obtenerProspectos);

//obtener propsectos por categoria
router.get("/categoria/:id_categoria", obtenerProspectosPorCategoria);

// Obtener prospectos de una vendedora
router.get("/vendedora/:cedula_vendedora", verificarToken, obtenerProspectosPorVendedora);

// Obtener prospectos por estado
router.get("/estado/:estado", verificarToken, obtenerProspectosPorEstado);

// Obtener un prospecto por ID
router.get("/:id_prospecto", verificarToken, obtenerProspectoPorId);

// Crear un nuevo prospecto
router.post("/", verificarToken, upload.single("archivo"), crearProspecto);

// Actualizar un prospecto por ID
router.put("/:id_prospecto", upload.single("archivo"), actualizarProspecto);

// Eliminar un prospecto por ID
router.delete("/:id_prospecto", verificarToken, eliminarProspecto);



module.exports = router;
