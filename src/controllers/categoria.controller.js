const CategoriaProspecto = require("../models/CategoriaProspecto.model");

// Obtener todas las categorías
const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await CategoriaProspecto.findAll(); 
    res.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ message: "Error al obtener categorías", error });
  }
};

module.exports = { obtenerCategorias };
