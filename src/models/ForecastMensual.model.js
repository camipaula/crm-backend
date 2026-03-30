const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ForecastMensual = sequelize.define(
  "ForecastMensual",
  {
    id_forecast: {
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
    cedula_vendedora: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    id_categoria_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    monto_proyectado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get() {
        const raw = this.getDataValue("monto_proyectado");
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
    tableName: "forecast_mensual",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        name: "unique_forecast",
        fields: ["anio", "mes", "cedula_vendedora", "id_categoria_venta"],
      },
    ],
  }
);

module.exports = ForecastMensual;
