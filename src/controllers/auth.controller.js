const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario.model");


function validarCedulaEcuatoriana(cedula) {
  if (!cedula || cedula.length !== 10) return false;

  const digitos = cedula.split("").map(Number); //convierte la cédula de string a array
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

    // Validar campos obligatorios
    if (!cedula_ruc || !nombre || !email || !password || !rol) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    // Validación de cédula ecuatoriana solo si tiene 10 dígitos
    if (cedula_ruc.length === 10) {
      if (!validarCedulaEcuatoriana(cedula_ruc)) {
        return res.status(400).json({ message: "La cédula ingresada no es válida" });
      }
    } else {
      // Validación básica para otros tipos de documento
      if (cedula_ruc.length < 6) {
        return res.status(400).json({ message: "Verificar el documento ingresado" });
      }
    }

    if (!validarEmail(email)) {
      return res.status(400).json({ message: "El correo electrónico no es válido" });
    }
    
    // Opcional: validar longitud mínima de la contraseña
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Verifica si el usuario ya existe por email
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ message: "El usuario ya está registrado" });
    }

    // Verifica si la cédula ya está registrada
    const cedulaExistente = await Usuario.findOne({ where: { cedula_ruc } });
    if (cedulaExistente) {
      return res.status(400).json({ message: "La cédula ya está registrada" });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el nuevo usuario
    const nuevoUsuario = await Usuario.create({
      cedula_ruc,
      nombre,
      email,
      password: hashedPassword,
      rol,
      estado: 1, // opcional, para activar usuario por defecto
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

    
    // Genera el token con la cédula y el rol dentro del payload
    const token = jwt.sign(
      { cedula_ruc: usuario.cedula_ruc, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
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
