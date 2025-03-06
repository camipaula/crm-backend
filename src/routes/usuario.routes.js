const express = require("express");
const { obtenerVendedoras,obtenerVendedoraPorCedula, actualizarVendedora, eliminarVendedora} = require("../controllers/usuario.controller");

const router = express.Router();

// Ruta para obtener vendedoras
router.get("/vendedoras", obtenerVendedoras);

// Ruta para obtener vendedora
router.get("/vendedoras/:cedula_ruc", obtenerVendedoraPorCedula);

// Ruta para Editar Vendedora
router.put("/vendedoras/:cedula_ruc", actualizarVendedora);

// Ruta para eliminar Vendedora
router.delete("/vendedoras/:cedula_ruc", eliminarVendedora);

module.exports = router;
