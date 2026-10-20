const nodemailer = require("nodemailer");
const twilio = require("twilio");

function getGmailConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !password || password.length !== 16) {
    return null;
  }
  return { user, pass: password };
}

function getPakistanMobileNumber(phone) {
  const value = phone.trim();
  const digits = value.replace(/\D/g, "");

  if (/^03\d{9}$/.test(digits)) {
    return `+92${digits.slice(1)}`;
  }
  if (/^92\d{10}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\+92\d{10}$/.test(value.replace(/[\s()-]/g, ""))) {
    return value.replace(/[\s()-]/g, "");
  }
  return null;
}

async function sendOrderConfirmation(order) {
  const orderNumber = order._id.toString();
  const total = `PKR ${order.amountTotal.toLocaleString("en-PK")}`;
  const lines = order.items.map(
    (item) => `${item.name} x ${item.quantity} - PKR ${(item.unitAmount * item.quantity).toLocaleString("en-PK")}`
  );
  const paymentMethod =
    order.paymentMethod === "cash_on_delivery" ? "Cash on delivery" : "Bank transfer";
  const message = [
    `Scatch order ${orderNumber} received.`,
    ...lines,
    `Total: ${total}.`,
    `Payment: ${paymentMethod}.`,
  ].join("\n");

  const notifications = [];
  const gmailConfig = getGmailConfig();
  if (gmailConfig) {
    notifications.push({
      channel: "email",
      send: () => {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailConfig.user,
            pass: gmailConfig.pass,
          },
        });
        return transporter.sendMail({
          from: process.env.GMAIL_FROM || gmailConfig.user,
          to: order.shippingDetails.email,
          subject: `Scatch order confirmation - ${orderNumber}`,
          text: `Hello ${order.shippingDetails.name},\n\n${message}\n\nThank you for shopping with Scatch.`,
        });
      },
    });
  } else {
    console.warn(
      `Order ${orderNumber} email confirmation skipped: configure GMAIL_USER and a 16-character Google App Password in .env.`
    );
  }

  const mobileNumber = getPakistanMobileNumber(order.shippingDetails.phone);
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    mobileNumber
  ) {
    notifications.push({
      channel: "SMS",
      send: () => {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        return client.messages.create({
          body: `Scatch order ${orderNumber} received. Total ${total}. Payment: ${paymentMethod}.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: mobileNumber,
        });
      },
    });
  } else {
    console.warn(
      `Order ${orderNumber} SMS confirmation skipped: configure Twilio credentials and use a Pakistan mobile number.`
    );
  }

  const results = await Promise.allSettled(
    notifications.map(({ send }) => Promise.resolve().then(send))
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Order ${orderNumber} ${notifications[index].channel} confirmation failed:`,
        result.reason?.message || result.reason
      );
    }
  });
}

module.exports = { getGmailConfig, sendOrderConfirmation };
