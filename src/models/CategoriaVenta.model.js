const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CategoriaVenta = sequelize.define(
  "CategoriaVenta",
  {
    id_categoria_venta: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "categoria_venta",
    timestamps: false,
  }
);

module.exports = CategoriaVenta;
