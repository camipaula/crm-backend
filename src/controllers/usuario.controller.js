const bcrypt = require("bcryptjs"); 
const Usuario = require("../models/Usuario.model");
const Prospecto = require("../models/Prospecto.model");

// Obtener todas las vendedoras (Añadido ultima_conexion)
const obtenerVendedoras = async (req, res) => {
  try {
    const vendedoras = await Usuario.findAll({
      where: { rol: "vendedora" },
      attributes: ["id_usuario", "cedula_ruc", "nombre", "email", "estado", "ultima_conexion"],
    });

    res.json(vendedoras);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener vendedoras", error });
  }
};

// Obtener una vendedora específica
const obtenerVendedoraPorCedula = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;
    const vendedora = await Usuario.findOne({
      where: { cedula_ruc, rol: "vendedora" },
      attributes: ["cedula_ruc", "nombre", "email", "estado", "ultima_conexion"],
    });

    if (!vendedora) {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    res.json(vendedora);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener vendedora", error });
  }
};

// Editar vendedora
const actualizarVendedora = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;
    const { nombre, email, estado, password } = req.body;

    const vendedora = await Usuario.findByPk(cedula_ruc);
    if (!vendedora || vendedora.rol !== "vendedora") {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    if (nombre !== undefined) vendedora.nombre = nombre;
    if (email !== undefined) vendedora.email = email;
    if (estado !== undefined) vendedora.estado = parseInt(estado, 10);

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      vendedora.password = hashedPassword;
    }

    await vendedora.save();
    
    res.json({ message: "Vendedora actualizada correctamente", vendedora });
  } catch (error) {
    console.error("Error al actualizar vendedora:", error);
    res.status(500).json({ message: "Error al actualizar vendedora", error });
  }
};

const actualizarPerfilAdmin = async (req, res) => {
  try {
    const cedula_ruc = req.usuario.cedula_ruc;
    const { email, password } = req.body;

    const admin = await Usuario.findByPk(cedula_ruc);

    if (!admin || admin.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    if (email) admin.email = email;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      admin.password = hashedPassword;
    }

    await admin.save();
    res.json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ message: "Error al actualizar perfil", error });
  }
};

// Eliminar vendedora
const eliminarVendedora = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;

    const vendedora = await Usuario.findByPk(cedula_ruc);
    if (!vendedora || vendedora.rol !== "vendedora") {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    await Prospecto.update(
      { cedula_vendedora: null }, 
      { where: { cedula_vendedora: cedula_ruc } }
    );

    await vendedora.destroy();

    res.json({ message: "Vendedora eliminada correctamente. Los prospectos quedaron sin asignar." });
  } catch (error) {
    console.error("Error al eliminar vendedora:", error); 
    res.status(500).json({ message: "Error al eliminar vendedora", error: error.message });
  }
};

// Cambiar el estado de una vendedora (activar o inactivar)
const cambiarEstadoVendedora = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;
    const { estado } = req.body;

    const vendedora = await Usuario.findByPk(cedula_ruc);
    if (!vendedora || vendedora.rol !== "vendedora") {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    if (estado !== 0 && estado !== 1) {
      return res.status(400).json({ message: "Estado inválido. Solo se permite 0 o 1." });
    }

    vendedora.estado = estado;
    await vendedora.save();

    res.json({ message: `Vendedora ${estado === 1 ? "activada" : "inactivada"} correctamente` });
  } catch (error) {
    console.error("Error al cambiar el estado de la vendedora:", error);
    res.status(500).json({ message: "Error al cambiar el estado", error });
  }
};

// Obtener Perfil Admin
const obtenerPerfilAdmin = async (req, res) => {
  try {
    const cedula_ruc = req.usuario.cedula_ruc; 
    const admin = await Usuario.findByPk(cedula_ruc, {
      attributes: ["cedula_ruc", "nombre", "email", "rol"]
    });

    if (!admin || admin.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    res.json(admin);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
};

module.exports = { 
  obtenerVendedoras, 
  obtenerVendedoraPorCedula, 
  actualizarVendedora,
  actualizarPerfilAdmin, 
  eliminarVendedora, 
  cambiarEstadoVendedora, 
  obtenerPerfilAdmin
};