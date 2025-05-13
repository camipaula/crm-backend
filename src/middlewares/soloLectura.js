// middlewares/soloLectura.js
const soloLectura = (req, res, next) => {
  if (req.usuario?.rol === "lectura") {
    if (req.method !== "GET") {
      return res.status(403).json({ message: "Acceso restringido: solo lectura permitida." });
    }
  }
  next();
};

module.exports = soloLectura;
