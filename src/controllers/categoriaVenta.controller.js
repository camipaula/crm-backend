const CategoriaVenta = require("../models/CategoriaVenta.model");

const listarCategoriasVenta = async (req, res) => {
  try {
    const categorias = await CategoriaVenta.findAll({
      attributes: ["id_categoria_venta", "nombre"],
      order: [["nombre", "ASC"]],
    });
    res.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías de venta:", error);
    res.status(500).json({ message: "Error al obtener categorías de venta", error });
  }
};

module.exports = { listarCategoriasVenta };
