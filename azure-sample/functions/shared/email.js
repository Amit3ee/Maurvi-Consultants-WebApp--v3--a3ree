/**
 * Shared Module: Email Service
 * Sends emails using SendGrid API
 */

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key from environment
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send email using SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content (optional)
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    const msg = {
      to: to,
      from: process.env.SENDER_EMAIL || 'noreply@maurviconsultants.com',
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>')
    };
    
    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
    
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendOTPEmail(email, otp) {
  const subject = 'Your OTP Code - Maurvi Consultants';
  const text = `Your OTP code is: ${otp}\n\nThis code is valid for 3 minutes.\n\nIf you didn't request this code, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Maurvi Consultants - OTP Verification</h2>
      <p>Your OTP code is:</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #666;">This code is valid for <strong>3 minutes</strong>.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;
  
  await sendEmail({ to: email, subject, text, html });
}

module.exports = {
  sendEmail,
  sendOTPEmail
};
