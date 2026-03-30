const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VentaRealMensual = sequelize.define(
  "VentaRealMensual",
  {
    id_venta_real: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    anio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    codigo_vendedora_externo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    // 🌟 AQUÍ ESTÁ EL NUEVO CAMPO 🌟
    nombre_vendedora_externo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_categoria_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_vendido: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const raw = this.getDataValue("total_vendido");
        return raw != null ? Number(raw) : null;
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "venta_real_mensual",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        name: "unique_venta_real_mensual",
        fields: ["anio", "mes", "codigo_vendedora_externo", "id_categoria_venta"],
      },
    ],
  }
);

module.exports = VentaRealMensual;