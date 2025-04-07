const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EstadoProspecto = sequelize.define("EstadoProspecto", {
  id_estado: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
}, {
  tableName: "estado_prospecto",
  timestamps: false,
});

module.exports = EstadoProspecto;
