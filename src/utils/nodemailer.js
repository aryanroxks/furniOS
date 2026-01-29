// utils/sendEmailOTP.js
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

export const sendEmailOTP = async (email, otp) => {
  console.log(process.env.EMAIL_PASS)
  console.log(process.env.EMAIL_USER)
  console.log(email)
  await transporter.sendMail({
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <p>Your OTP is:</p>
      <h2>${otp}</h2>
      <p>Valid for 10 minutes.</p>
    `
  })
}
