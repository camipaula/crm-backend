const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TipoSeguimiento = sequelize.define("TipoSeguimiento", {
    id_tipo: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false,
    }
}, {
    tableName: "tipo_seguimiento",
    timestamps: false, 
    underscored: true,
});

module.exports = TipoSeguimiento;
