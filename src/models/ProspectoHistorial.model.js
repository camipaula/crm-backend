const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Prospecto = require("./Prospecto.model");
const Usuario = require("./Usuario.model");

const ProspectoHistorial = sequelize.define(
  "ProspectoHistorial",
  {
    id_historial: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_prospecto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Prospecto, key: "id_prospecto" },
      onDelete: "CASCADE",
    },
    cedula_usuario: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: { model: Usuario, key: "cedula_ruc" },
      onDelete: "CASCADE",
    },
    tipo: {
      type: DataTypes.ENUM("evento", "nota"),
      allowNull: false,
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "prospecto_historial",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = ProspectoHistorial;
