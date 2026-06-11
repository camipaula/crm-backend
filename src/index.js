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
const categoriasRoutes = require("./routes/categorias");
const categoriasVentaRoutes = require("./routes/categoriasVenta.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const dashboardMetasRoutes = require("./routes/dashboardMetas.routes");
const documentoRoutes = require("./routes/documento.routes");
const logsRoutes = require("./routes/logs.routes");
const forecastRoutes = require("./routes/forecast.routes");
const indicadoresRoutes = require("./routes/indicadores.routes"); // 👇 Importamos la ruta aquí arriba con las demás

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express(); // 👉 AQUÍ NACE "app"

// Middleware
app.use(cors());
app.use(express.json());

// Archivos subidos (para descargar documentos)
app.use("/api/uploads", express.static("uploads"));

// Definir rutas (Todo esto va DESPUÉS de const app = express())
app.use("/api/auth", authRoutes);
app.use("/api/prospectos", prospectoRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/ventas", ventaRoutes);
app.use("/api/seguimientos", seguimientoRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/categorias-venta", categoriasVentaRoutes);
app.use("/api/documentos", documentoRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/forecast", forecastRoutes);

// Dashboard: GET /api/dashboard (principal), GET /api/dashboard/metas (KPIs metas)
app.use("/api/dashboard", dashboardRoutes);
// Dashboard metas (mismo controller): GET /api/dashboard-metas?anio=2026&mes=1
app.use("/api/dashboard-metas", dashboardMetasRoutes);

// 👇 Y usamos la ruta de indicadores aquí, junto a sus hermanas
app.use("/api/indicadores", indicadoresRoutes);


require("./models/MatchVendedora.model");
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
    console.log(" Base de datos sincronizada (tablas actualizadas).");
  } catch (error) {
    console.error(" Error al conectar la base de datos:", error);
  }
});