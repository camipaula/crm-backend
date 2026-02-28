const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Prospecto = require("./Prospecto.model");
const VentaProspecto = require("./VentaProspecto.model");
const Usuario = require("./Usuario.model");

const Documento = sequelize.define(
  "Documento",
  {
    id_documento: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM("propuesta", "contrato", "correo", "formulario", "interno", "otro"),
      allowNull: false,
    },
    ruta_archivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tamanio: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_prospecto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Prospecto, key: "id_prospecto" },
      onDelete: "SET NULL",
    },
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: VentaProspecto, key: "id_venta" },
      onDelete: "SET NULL",
    },
    subido_por: {
      type: DataTypes.STRING(20),
      allowNull: true,
      references: { model: Usuario, key: "cedula_ruc" },
      onDelete: "SET NULL",
    },
    eliminado: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
    },
  },
  {
    tableName: "documento",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Documento;
