import nodemailer from "nodemailer";

type Attachment = {
  filename: string;
  content: Buffer;
};
// Type for mail options
type MailOptions = {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
};

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === "465", // true for port 465, false for other ports (like 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Function to send an email (this part is unchanged)
export const sendMail = async ({
  to,
  subject,
  html,
  attachments = [],
}: MailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `"Project Pro" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments,
    });
    return info;
  } catch (error) {
    console.error("Error sending email: ", error);
    throw new Error("Could not send email.");
  }
};
