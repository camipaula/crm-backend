const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sequelize = require("./config/database");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const prospectoRoutes = require("./routes/prospecto.routes");
const usuarioRoutes = require("./routes/usuario.routes");
const ventaRoutes = require("./routes/venta.routes"); 
const seguimientoRoutes = require("./routes/seguimiento.routes"); 

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Definir rutas
app.use("/api/auth", authRoutes);
app.use("/api/prospectos", prospectoRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/ventas", ventaRoutes); 
app.use("/api/seguimientos", seguimientoRoutes); 

// Importar asociaciones entre modelos antes de sincronizar
require("./models/associations");

// Configuración del servidor
const PORT = process.env.PORT || 5000;

// Iniciar servidor y conectar base de datos
app.listen(PORT, async () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);

  try {
    await sequelize.authenticate();
    console.log(" Conexión a la base de datos establecida.");
    
    await sequelize.sync({ alter: true }); 
    console.log(" Modelos sincronizados con la base de datos.");
  } catch (error) {
    console.error(" Error al conectar la base de datos:", error);
  }
});
