const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario.model");

const LogActividad = sequelize.define(
  "LogActividad",
  {
    id_actividad: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cedula_usuario: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: { model: Usuario, key: "cedula_ruc" },
      onDelete: "CASCADE",
    },
    modulo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    accion: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    referencia_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "log_actividad",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = LogActividad;
