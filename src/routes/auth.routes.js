const express = require("express");
const { login, signup } = require("../controllers/auth.controller");
const verificarToken = require("../middlewares/authMiddleware"); 

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Nueva ruta para obtener el rol del usuario autenticado
router.get("/rol", verificarToken, (req, res) => {
  res.json({ rol: req.usuario.rol });
});

module.exports = router;
