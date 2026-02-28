const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario.model");

const LogAcceso = sequelize.define(
  "LogAcceso",
  {
    id_log: {
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
    fecha_ingreso: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "log_acceso",
    timestamps: false,
  }
);

module.exports = LogAcceso;
