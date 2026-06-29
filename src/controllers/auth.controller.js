const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario.model");
const LogAcceso = require("../models/LogAcceso.model");
const { registrarLogAcceso } = require("../utils/audit");

function validarCedulaEcuatoriana(cedula) {
  if (!cedula || cedula.length !== 10) return false;

  const digitos = cedula.split("").map(Number);
  const provincia = parseInt(cedula.substring(0, 2));

  if (provincia < 1 || provincia > 24) return false;

  const digitoVerificador = digitos.pop();
  let suma = 0;

  digitos.forEach((d, i) => {
    if (i % 2 === 0) {
      let mult = d * 2;
      if (mult > 9) mult -= 9;
      suma += mult;
    } else {
      suma += d;
    }
  });

  const decenaSuperior = Math.ceil(suma / 10) * 10;
  const digitoCalculado = decenaSuperior - suma;

  return digitoCalculado === digitoVerificador;
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

const signup = async (req, res) => {
  try {
    const { cedula_ruc, nombre, email, password, rol } = req.body;

    if (!cedula_ruc || !nombre || !email || !password || !rol) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    if (cedula_ruc.length === 10) {
      if (!validarCedulaEcuatoriana(cedula_ruc)) {
        return res.status(400).json({ message: "La cédula ingresada no es válida" });
      }
    } else {
      if (cedula_ruc.length < 6) {
        return res.status(400).json({ message: "Verificar el documento ingresado" });
      }
    }

    if (!validarEmail(email)) {
      return res.status(400).json({ message: "El correo electrónico no es válido" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ message: "El usuario ya está registrado" });
    }

    const cedulaExistente = await Usuario.findOne({ where: { cedula_ruc } });
    if (cedulaExistente) {
      return res.status(400).json({ message: "La cédula ya está registrada" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await Usuario.create({
      cedula_ruc,
      nombre,
      email,
      password: hashedPassword,
      rol,
      estado: 1,
    });

    res.status(201).json({ message: "Usuario creado exitosamente", usuario: nuevoUsuario });
  } catch (error) {
    console.error("Error en signup:", error);
    res.status(500).json({ message: "Error al registrar usuario", error });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    if (usuario.estado === 0) {
      return res.status(403).json({ message: "Usuario inactivo. Contacte al administrador." });
    }
    
    const token = jwt.sign(
      { cedula_ruc: usuario.cedula_ruc, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Registra el log histórico de accesos
    await registrarLogAcceso(usuario.cedula_ruc, req);

    // Actualiza la última conexión de inmediato para activar el indicador visual
    await Usuario.update(
      { ultima_conexion: new Date() },
      { where: { cedula_ruc: usuario.cedula_ruc } }
    );

    res.status(200).json({
      message: "Login exitoso",
      token,
      rol: usuario.rol
    });

  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error });
  }
};

const registrarPing = async (req, res) => {
  try {
    const { cedula_ruc } = req.usuario; 
    
    await Usuario.update(
      { ultima_conexion: new Date() },
      { where: { cedula_ruc } }
    );

    res.status(200).json({ message: "Latido recibido" });
  } catch (error) {
    console.error("Error en ping:", error);
    res.status(500).json({ message: "Error al registrar latido" });
  }
};

// Nueva función para limpiar la conexión al cerrar sesión
const logoutSystem = async (req, res) => {
  try {
    const { cedula_ruc } = req.usuario;

    // 1. Apagamos el foquito verde
    await Usuario.update(
      { ultima_conexion: null },
      { where: { cedula_ruc } }
    );

    // 2. 👇 NUEVO: Buscamos su último ingreso y anotamos la salida
    const ultimoAcceso = await LogAcceso.findOne({
      where: { cedula_usuario: cedula_ruc },
      order: [['fecha_ingreso', 'DESC']]
    });

    if (ultimoAcceso && !ultimoAcceso.fecha_salida) {
      ultimoAcceso.fecha_salida = new Date();
      await ultimoAcceso.save();
    }

    res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error en logoutSystem:", error);
    res.status(500).json({ message: "Error al cerrar sesión", error });
  }
};

module.exports = { signup, login, registrarPing, logoutSystem };