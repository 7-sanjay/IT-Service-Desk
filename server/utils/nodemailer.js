require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
// let accessToken = "";

// const oauthGetToken = async () => {
//   const oauth2Client = new OAuth2(
//     process.env.OAUTH_GOOGLE_CLIENT_ID,
//     process.env.OAUTH_GOOGLE_CLIENT_SECRET,
//     process.env.OAUTH_PLAYGROUND
//   );

//   oauth2Client.setCredentials({
//     refresh_token: process.env.OAUTH_GOOGLE_REFRESH_TOKEN,
//   });
//   // get access token
//   await oauth2Client.getAccessToken();
//   return oauth2Client.credentials;
// };

// oauthGetToken()
//   .then((crd) => {
//     accessToken = crd.access_token;
//   })
//   .catch((err) => {
//     console.log("Error get access token from google oauth2");
//   });

// let transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     type: "OAuth2",
//     user: process.env.MAIL_USER,
//     clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
//     clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
//     refreshToken: process.env.OAUTH_GOOGLE_REFRESH_TOKEN,
//     accessToken: accessToken,
//   },
// });

// let mailOptions = {
//   from: "Alwan",
//   to: process.env.MAIL_DESTINATION,
//   subject: `Request baru diterima dari Alwan`,
//   html: `
//   <h3>Dear team IT,</h3>
//   <p>
//     System Ticketing Menerima Request dari <b>Alwan</b> dan silahkan
//     anda login ke Ticketing System untuk memproses request yang masuk,
//     terima kasih.
//   </p>
//   `,
// };

// transporter.sendMail(mailOptions, (err, info) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log("Email sent!");
//   }
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

module.exports = transporter;
