import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: 'muzammilarif310@gmail.com',
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}
