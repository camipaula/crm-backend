const express = require("express");
const { 
    obtenerVendedoras,
    obtenerVendedoraPorCedula, 
    actualizarVendedora, 
    actualizarPerfilAdmin,
    eliminarVendedora, 
    cambiarEstadoVendedora,
    obtenerPerfilAdmin,
} = require("../controllers/usuario.controller");

const verificarToken = require("../middlewares/authMiddleware");

const router = express.Router();

// Ruta para obtener vendedoras
router.get("/vendedoras", obtenerVendedoras);

// Ruta para obtener vendedora
router.get("/vendedoras/:cedula_ruc", obtenerVendedoraPorCedula);

// Ruta para Editar Vendedora
router.put("/vendedoras/:cedula_ruc", actualizarVendedora);

// Ruta para inactivar vendedora (opcional si prefieres separarla)
router.patch("/vendedoras/:cedula_ruc/inactivar", cambiarEstadoVendedora);

// Ruta para eliminar Vendedora
router.delete("/vendedoras/:cedula_ruc", eliminarVendedora);

router.get("/mi-perfil", verificarToken, obtenerPerfilAdmin);
router.put("/mi-perfil", verificarToken, actualizarPerfilAdmin);


module.exports = router;
