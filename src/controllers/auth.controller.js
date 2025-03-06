const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario.model");

const signup = async (req, res) => { 
  try {
    const {cedula_ruc, nombre, email, password, rol } = req.body; //cédula como id

    // Verifica si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ message: "El usuario ya está registrado" });
    }

    // Verifica si la cédula ya existe
    const cedulaExistente = await Usuario.findOne({ where: { cedula_ruc  } });
    if (cedulaExistente) {
      return res.status(400).json({ message: "La cédula ya está registrada" });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el nuevo usuario con la cédula como ID
    const nuevoUsuario = await Usuario.create({
      cedula_ruc,  // Ahora es la cédula
      nombre,
      email,
      password: hashedPassword,
      rol,
    });

    res.status(201).json({ message: "Usuario creado exitosamente", usuario: nuevoUsuario });
  } catch (error) {
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

    // Genera el token con la cédula y el rol dentro del payload
    const token = jwt.sign(
      { cedula_ruc: usuario.cedula_ruc, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
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



module.exports = { signup, login };
