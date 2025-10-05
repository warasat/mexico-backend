const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'muzammilarif310@gmail.com',
    pass: 'zwdx rciy diap ejwo',
  }
});

// Send email function
const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: 'muzammilarif310@gmail.com',
    to,
    subject,
    html
  };
  
  console.log("Sending email to:", to);
  console.log("Subject:", subject);
  
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  transporter
};
