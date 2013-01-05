var redis = require('redis');

exports.setAccessToken = function (userId, accessToken, cb) {
  exports.client.hset(userId, 'accessToken', accessToken, function (err) {
    cb(err);
  });
};

exports.getUser = function (userId, cb) {
  exports.client.hgetall(userId, function (err, user) {
    cb(err, user);
  });
};

exports.init = function (cb) {
  exports.client = redis.createClient();

  exports.client.select(8, function () {
    cb();
  });
};
