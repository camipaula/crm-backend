const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MatchVendedora = sequelize.define(
  "MatchVendedora",
  {
    codigo_vendedora_externo: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "match_vendedora",
    timestamps: true, // Útil para saber cuándo se hizo el match
  }
);

module.exports = MatchVendedora;