const bcrypt = require("bcrypt"); 
const Usuario = require("../models/Usuario.model");
const Prospecto = require("../models/Prospecto.model");


const obtenerVendedoras = async (req, res) => {
  try {
    const vendedoras = await Usuario.findAll({
      where: { rol: "vendedora" },
      attributes: ["cedula_ruc", "nombre", "email", "estado"],
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
      attributes: ["cedula_ruc", "nombre", "email", "estado"],
    });

    if (!vendedora) {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    res.json(vendedora);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener vendedora", error });
  }
};

//editar venededora
const actualizarVendedora = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;
    const { nombre, email, estado, password } = req.body;

    const vendedora = await Usuario.findByPk(cedula_ruc);
    if (!vendedora || vendedora.rol !== "vendedora") {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    // Solo actualizar si los valores existen en req.body
    if (nombre !== undefined) vendedora.nombre = nombre;
    if (email !== undefined) vendedora.email = email;
    if (estado !== undefined) vendedora.estado = parseInt(estado, 10);

    // Si se envía una nueva contraseña, la encriptamos antes de guardarla
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


//eliminar vendedora
const eliminarVendedora = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;

    const vendedora = await Usuario.findByPk(cedula_ruc);
    if (!vendedora || vendedora.rol !== "vendedora") {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    // Antes de eliminar, actualizar los prospectos para que tengan vendedora en NULL
    await Prospecto.update(
      { cedula_vendedora: null }, // Se pone en NULL en la base de datos
      { where: { cedula_vendedora: cedula_ruc } }
    );

    // Ahora eliminar la vendedora
    await vendedora.destroy();

    res.json({ message: "Vendedora eliminada correctamente. Los prospectos quedaron sin asignar." });
  } catch (error) {
    console.error("Error al eliminar vendedora:", error); // Mostramos el error exacto en consola
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




module.exports = { obtenerVendedoras, obtenerVendedoraPorCedula, actualizarVendedora, eliminarVendedora, cambiarEstadoVendedora};


