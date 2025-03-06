const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario.model"); 

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Acceso denegado. No hay token." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario en la base de datos
    const usuario = await Usuario.findByPk(decoded.cedula_ruc); 
    if (!usuario) {
      return res.status(401).json({ message: "Usuario no encontrado." });
    }

    req.usuario = { cedula_ruc: usuario.cedula_ruc, rol: usuario.rol }; // Guardar usuario en req
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido." });
  }
};

module.exports = verificarToken;
