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
const soloLectura = require("../middlewares/soloLectura");

const router = express.Router();

// Ruta para obtener vendedoras
router.get("/vendedoras", obtenerVendedoras);

// Ruta para obtener vendedora
router.get("/vendedoras/:cedula_ruc", obtenerVendedoraPorCedula);

// Ruta para Editar Vendedora
router.put("/vendedoras/:cedula_ruc", verificarToken,soloLectura, actualizarVendedora);

// Ruta para inactivar vendedora (opcional si prefieres separarla)
router.patch("/vendedoras/:cedula_ruc/inactivar",verificarToken, soloLectura, cambiarEstadoVendedora);

// Ruta para eliminar Vendedora
router.delete("/vendedoras/:cedula_ruc",verificarToken,soloLectura, eliminarVendedora);

router.get("/mi-perfil", verificarToken,soloLectura, obtenerPerfilAdmin);
router.put("/mi-perfil", verificarToken,soloLectura, actualizarPerfilAdmin);


module.exports = router;
