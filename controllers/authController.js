import "dotenv/config";

import passport from 'passport';

const login = async (req, res, next) => {
  passport.authenticate("twitter")
};

const callback = async (req, res, next) => {
  console.log('callback')
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log('Successful!')
    res.redirect('/');
  }
};

export default { login, callback };
