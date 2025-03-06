const Usuario = require("../models/Usuario.model");

const obtenerVendedoras = async (req, res) => {
  try {
    const vendedoras = await Usuario.findAll({
      where: { rol: "vendedora" },
      attributes: ["cedula_ruc", "nombre", "email"], 
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
      attributes: ["cedula_ruc", "nombre", "email"],
    });

    if (!vendedora) {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    res.json(vendedora);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener vendedora", error });
  }
};

// Editar vendedoras
const actualizarVendedora = async (req, res) => {
  try {
    const { cedula_ruc } = req.params;
    const { nombre, email } = req.body;

    const vendedora = await Usuario.findByPk(cedula_ruc);
    if (!vendedora || vendedora.rol !== "vendedora") {
      return res.status(404).json({ message: "Vendedora no encontrada" });
    }

    vendedora.nombre = nombre;
    vendedora.email = email;
    await vendedora.save();

    res.json({ message: "Vendedora actualizada correctamente", vendedora });
  } catch (error) {
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

    await vendedora.destroy();

    res.json({ message: "Vendedora eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar vendedora", error });
  }
};

module.exports = { obtenerVendedoras,obtenerVendedoraPorCedula, actualizarVendedora, eliminarVendedora };


