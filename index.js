import "dotenv/config";

import session from "express-session";
import express from "express";
import mongoose from "mongoose";
import passport from "passport";
import bodyParser from 'body-parser';
import morgan from "morgan";

import usersRoutes from "./routes/usersRoutes.js";
import tweetRoutes from "./routes/tweetRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import passportSetup from "./config/passport-setup.js";

const app = express();
const port = 5000;

app.use(morgan("dev"));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
  next();
});

// Passport
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "keyboard cat",
  })
);


app.use(passport.initialize());
app.use(passport.session());
passportSetup();
app.get("/api/auth/twitter", passport.authenticate("twitter"));
app.get(
  "/api/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/api/auth/arf" }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login?userId=${req.user.user.id}&token=${req.user.token}&secret=${req.user.secret}`)
    // res.send(req.user.token)
  }
);

// Routes
app.use("/api/users", usersRoutes);
app.use("/api/tweets", tweetRoutes);
app.use("/api/accounts", accountRoutes);

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, err => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});

mongoose
  .set("strictQuery", false)
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@twitter-dashboard.avpiecv.mongodb.net/?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(process.env.PORT || port);
    console.log(`Listening on PORT ${process.env.PORT || port}`);
  })
  .catch((error) => {
    console.log(error);
  });
