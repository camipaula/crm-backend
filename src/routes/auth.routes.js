const express = require("express");
const { login, signup, registrarPing, logoutSystem } = require("../controllers/auth.controller");
const verificarToken = require("../middlewares/authMiddleware"); 

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Ruta para obtener el rol del usuario autenticado
router.get("/rol", verificarToken, (req, res) => {
  res.json({ rol: req.usuario.rol });
});

// Ruta para actualizar el latido en segundo plano
router.put("/ping", verificarToken, registrarPing);

// Ruta para desconectar al usuario y apagar el indicador
router.put("/logout", verificarToken, logoutSystem);

module.exports = router;