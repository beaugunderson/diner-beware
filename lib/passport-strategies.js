var passport = require('passport');
var FoursquareStrategy = require('passport-foursquare').Strategy;

var users = require('./models/user');

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  users.getUser(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new FoursquareStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://dinerbeware.com/auth/foursquare/callback"
  },
  function (accessToken, refreshToken, profile, done) {
    console.log('Success:', accessToken, profile.id);

    users.setAccessToken(profile.id, accessToken, function (err) {
      done(err, {
        id: profile.id,
        _id: profile.id,
        accessToken: accessToken
      });
    });
  }
));
