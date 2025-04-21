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
  obtenerOrigenes,
  obtenerProspectosPorCategoria,
  exportarProspectos,
  obtenerEstadosProspecto,
  obtenerCiudades,
obtenerProvincias
} = require("../controllers/prospecto.controller");

const verificarToken = require("../middlewares/authMiddleware");

const router = express.Router();
//Exportar a excel
router.get("/exportar", verificarToken, exportarProspectos);

// Obtener todos los sectores únicos de los prospectos
router.get("/sectores", verificarToken, obtenerSectores);
// Obtener todas las provincias  únicos de los prospectos
router.get("/provincias", verificarToken, obtenerProvincias);

// Obtener todos las ciiudades únicos de los prospectos
router.get("/ciudades", verificarToken, obtenerCiudades);

//obtener origenes del prospecto
router.get("/origenes", verificarToken, obtenerOrigenes);

//Obtener estados de prospecto
router.get("/estados", verificarToken, obtenerEstadosProspecto);

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


router.put("/:id_prospecto/eliminar", verificarToken, eliminarProspecto);


module.exports = router;
