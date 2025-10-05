const nodemailer = require('nodemailer');
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'muzammilarif310@gmail.com',
    pass: 'dxwh egbh tyow bbvj',
  }
});


module.exports.sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: 'muzammilarif310@gmail.com',
    to,
    subject,
    html
  };
//   console.log("mailoptions: "   , mailOptions);
  try {
    await transporter.sendMail(mailOptions);
    // console.log('Email sent successfully');
  } catch (error) {
    // console.error('Error sending email:', error);
  }
}
