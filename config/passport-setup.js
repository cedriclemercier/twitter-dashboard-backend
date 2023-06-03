import "dotenv/config";

import passport from "passport";
import * as TwitterStrategy from "passport-twitter";
import { generateUsername } from "unique-username-generator";

import User from "../models/user.js";

const TWITTER_CONSUMER_KEY = process.env.CONSUMER_KEY;
const TWITTER_CONSUMER_SECRET = process.env.CONSUMER_SECRET;

export default function () {
  console.log("Registrating passport");
  passport.use(
    new TwitterStrategy.Strategy(
      {
        consumerKey: TWITTER_CONSUMER_KEY,
        consumerSecret: TWITTER_CONSUMER_SECRET,
        callbackURL: "/api/auth/twitter/callback",
      },
      async (token, tokenSecret, profile, done) => {
        console.log("Username:" + profile.username);
        let user;
        try {
          user = await User.findOne({
            twitter_id: profile.id,
          });

          if (!user) {
            const userGeneratedName = generateUsername("-", 2, 20);
            user = await User.create({
              username: userGeneratedName,
              name: userGeneratedName,
              twitter_id: profile.id,
              twitter_name: profile.displayName,
              twitter_username: profile.username,
              twitter_profile_image_url: profile._json.profile_image_url,
              twitter_description: profile._json.description,
            });
          }
          console.log(user);
        } catch (err) {
          console.log(err);
          return done(err, null);
        }
        return done(null, {user: user, token: token, secret: tokenSecret});
      }
    )
  );

  passport.serializeUser(function (data, done) {
    done(null, data.user.id);
  });

  // passport.serializeUser(function (data, done) {
  //   done(null, data.userdata.user.id);
  // });

  passport.deserializeUser(function (id, done) {
    User.findById(id).then((user) => {
      done(null, user)
    })
  });
}