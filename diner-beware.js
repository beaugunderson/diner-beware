var express = require('express');
var consolidate = require('consolidate');
var passport = require('passport');
var querystring = require('querystring');
var request = require('request');
var swig = require('swig');
var _ = require('underscore');

var MongoStore = require('connect-mongo')(express);

require('./lib/passport-strategies');

var inspections = require('./lib/data');
var users = require('./lib/models/user');

swig.init({
  root: __dirname + '/views',
  allowErrors: true,
  cache: false
});

var app = module.exports.api = express();

app.engine('html', consolidate.swig);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.set('view options', { layout: false });
app.set('view cache', false);

app.use(express.logger());
app.use(express.compress());
app.use(express['static'](__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    db: 'diner-beware-sessions'
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/auth/foursquare', passport.authenticate('foursquare'));

app.get('/auth/foursquare/callback', passport.authenticate('foursquare', {
  failureRedirect: '/login',
  successReturnToOrRedirect: '/'
}));

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/privacy', function (req, res) {
  res.render('privacy');
});

app.get('/business/:businessId/:userId/:name', function (req, res) {
  var business = inspections.getBusiness(req.param('businessId'));

  var lastInspection = _.find(business.inspections, function (inspection) {
    return inspection.score;
  });

  var grade = '';

  if (lastInspection.score < 71) {
    grade = 'd';
  } else if (lastInspection.score < 86) {
    grade = 'c';
  } else if (lastInspection.score < 91) {
    grade = 'b';
  } else {
    grade = 'a';
  }

  res.render('business', {
    business: business,
    businessName: req.param('name'),
    back: req.param('fsqCallback'),
    grade: grade,
    userId: req.param('userId'),
    lastInspection: lastInspection
  });
});

app.post('/push', function (req, res) {
  if (req.body &&
    req.body.checkin &&
    req.body.user &&
    req.body.secret === process.env.PUSH_SECRET) {
    var data = req.body;

    data.checkin = JSON.parse(data.checkin);
    data.user = JSON.parse(data.user);

    // console.log(JSON.stringify(data, null, 2));
    // console.log(data.checkin.venue.categories[0].parents);

    inspections.findBusiness(data.checkin.venue, function (businesses) {
      if (!businesses.length) {
        return;
      }

      console.log(JSON.stringify(businesses[0], null, 2));

      users.getUser(data.user.id, function (err, user) {
        if (err) {
          console.log('Error:', err);
        }

        console.log('XXX user', JSON.stringify(user));

        var score;

        if (businesses[0].inspections.length) {
          if (businesses[0].inspections[0].score) {
            score = businesses[0].inspections[0].score;
          }
        }

        if (!score || businesses[0].matchScore < 15) {
          return;
        }

        var replyUrl = 'https://dinerbeware.com/business/' +
          businesses[0].business_id + '/' + data.user.id + '/' +
          querystring.escape(data.checkin.venue.name);

        var scoreSuffix = '';

        if (score < 71) {
          scoreSuffix = '; that\'s poor!';
        } else if (score < 86) {
          scoreSuffix = '; that\'s less than adequate!';
        } else if (score < 91) {
          scoreSuffix = '; that\'s adequate!';
        } else {
          scoreSuffix = '; that\'s good!';
        }

        var replyText = 'Health inspection of ' + score + ' for ' +
          data.checkin.venue.name + scoreSuffix;

        request.post({
          url: 'https://api.foursquare.com/v2/checkins/' + data.checkin.id +
            '/reply',
          qs: {
            text: replyText,
            url: replyUrl,
            oauth_token: user.accessToken,
            v: '20130105'
          }
        }, function (err, resp, body) {
          if (err) {
            console.log('Error:', err);
          }

          console.log('XXX body', JSON.stringify(body, null, 2));
        });
      });
    });
  }

  res.render('index');
});

// We want exceptions and stracktraces in development
app.configure('development', function () {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

// ... but not in production
app.configure('production', function () {
  app.use(express.errorHandler());
});

users.init(function (err) {
  if (err) throw err;

  inspections.load(function (err) {
    if (err) throw err;

    console.log('Listening on port', process.env.PORT);

    app.listen(process.env.PORT);
  });
});
