const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.santos-office.com',
  port: 465,
  secure: true, //conexión cifrada SSL/TLS. 
  auth: {
    user: 'noreply@santos-office.com',
    pass: 'Santos2025!'
  }
});

async function enviarCorreoCierre({ prospecto, estado, monto }) {
  const adminEmail = 'cvegatandazo@gmail.com, santosdist@gmail.com';

  const asunto = `Prospecto ${estado.toUpperCase()}: ${prospecto.nombre}`;
  const mensaje = `
    Hola 👋,

    El prospecto "${prospecto.nombre}" ha sido marcado como "${estado.toUpperCase()}".
    ${estado === 'Cierre' ? `Monto de cierre: $${monto}` : ''}

    Revisa el CRM para más detalles.

    — CRM Santos Office
  `;

  await transporter.sendMail({
    from: '"CRM Santos Office" <noreply@santos-office.com>',
    to: adminEmail,
    subject: asunto,
    text: mensaje,
  });
}

module.exports = { enviarCorreoCierre };
