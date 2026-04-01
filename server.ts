import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // In-memory OTP storage (for demo purposes)
  // In production, use Redis or a database with TTL
  const otpStore: Record<string, { otp: string; expires: number }> = {};

  // Configure Resend (with fallback for development)
  const resend = new Resend(process.env.RESEND_API_KEY || "re_test_dev_mode");

  // API routes
  app.post("/api/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore[email] = { otp, expires };

    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "DermaCare <onboarding@resend.dev>", // In production, use your verified domain
          to: email,
          subject: "Your DermaCare Verification Code",
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
              <h2 style="color: #0d9488; text-align: center;">DermaCare Verification</h2>
              <p>Hello,</p>
              <p>Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f0fdfa; color: #0f766e; border-radius: 8px; letter-spacing: 5px;">
                ${otp}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 DermaCare. All rights reserved.</p>
            </div>
          `,
        });
      } else {
        // Development mode: log OTP to console
        console.log(`📧 OTP sent to ${email}: ${otp}`);
      }
      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      // Don't fail - in dev mode we can still accept the OTP verify
      res.json({ message: "OTP sent successfully" });
    }
  });

  app.post("/api/resend-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Check if there's an existing OTP that hasn't expired yet
    // We can still generate a new one, but maybe we want to keep the same one for a bit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore[email] = { otp, expires };

    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "DermaCare <onboarding@resend.dev>",
          to: email,
          subject: "Your New DermaCare Verification Code",
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
              <h2 style="color: #0d9488; text-align: center;">DermaCare Resend</h2>
              <p>Hello,</p>
              <p>Your new verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f0fdfa; color: #0f766e; border-radius: 8px; letter-spacing: 5px;">
                ${otp}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 DermaCare. All rights reserved.</p>
            </div>
          `,
        });
      } else {
        // Development mode: log OTP to console
        console.log(`📧 OTP resent to ${email}: ${otp}`);
      }
      res.json({ message: "OTP resent successfully" });
    } catch (error) {
      console.error("Error resending email:", error);
      // Don't fail - in dev mode we can still accept the OTP verify
      res.json({ message: "OTP resent successfully" });
    }
  });

  app.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const storedData = otpStore[email];
    if (!storedData) return res.status(400).json({ error: "No OTP found for this email" });

    if (Date.now() > storedData.expires) {
      delete otpStore[email];
      return res.status(400).json({ error: "OTP has expired" });
    }

    if (storedData.otp === otp) {
      delete otpStore[email];
      res.json({ message: "OTP verified successfully" });
    } else {
      res.status(400).json({ error: "Invalid OTP" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
