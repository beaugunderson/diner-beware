var async = require('async');
var csv = require('csv');
var natural = require('natural');
var _ = require('underscore');

_.str = require('underscore.string');
_.mixin(_.str.exports());

exports.businesses = [];
exports.inspections = [];
exports.violations = [];

function cleanPhoneNumber(phoneNumber) {
  return phoneNumber.replace(/^\+1/, '').replace(/[^\d]/, '');
}

function cleanString(address) {
  return _.trim(address
    .replace(/[^a-z0-9 ]/ig, '')
    .replace(/restaurant/i, '')
    .replace(/ +/g, ' ').toLowerCase());
}

function loadBusinesses(cb) {
  csv()
    .from.path('./data/sf/Businesses.csv', {
      columns: true
    })
    .transform(function (data) {
      data.business_id = parseInt(data.business_id, 10);

      data.name = cleanString(data.name);
      data.address = cleanString(data.address);

      data.latitude = parseFloat(data.latitude, 10);
      data.longitude = parseFloat(data.longtitude, 10);

      // It's spelled wrong in the original data!
      delete data.longtitude;

      data.phone_number = cleanPhoneNumber(data.phone_number);

      return data;
    })
    .on('record', function (data) {
      exports.businesses.push(data);
    })
    .on('error', function (err) {
      console.error(err.message);
    })
    .on('end', function (count) {
      cb(null, count);
    });
}

function loadInspections(cb) {
  csv()
    .from.path('./data/sf/Inspections.csv', {
      columns: true
    })
    .transform(function (data) {
      data.business_id = parseInt(data.Business_Id, 10);
      data.score = parseInt(data.Score, 10);

      // Standardize capitalization
      delete data.Business_Id;
      delete data.Score;

      return data;
    })
    .on('record', function (data) {
      exports.inspections.push(data);
    })
    .on('error', function (err) {
      console.error(err.message);
    })
    .on('end', function (count) {
      cb(null, count);
    });
}

function loadViolations(cb) {
  csv()
    .from.path('./data/sf/Violations.csv', {
      columns: true
    })
    .transform(function (data) {
      data.business_id = parseInt(data.Business_Id, 10);

      // Standardize capitalization
      delete data.Business_Id;

      return data;
    })
    .on('record', function (data) {
      exports.violations.push(data);
    })
    .on('error', function (err) {
      console.error(err.message);
    })
    .on('end', function (count) {
      cb(null, count);
    });
}

exports.getBusiness = function (id) {
  id = parseInt(id, 10);

  var business = _.find(exports.businesses, function (business) {
    return business.business_id === id;
  });

  if (!business) {
    return;
  }

  // Find inspects for this business
  business.inspections = exports.inspections.filter(function (inspection) {
    return inspection.business_id === business.business_id;
  });

  // Find violations for this business
  business.violations = exports.violations.filter(function (violation) {
    return violation.business_id === business.business_id;
  });

  return business;
};

exports.findBusiness = function (venue, cb) {
  var near = exports.businesses.filter(function (business) {
    return Math.abs(venue.location.lat - business.latitude) < 0.00411726 &&
      Math.abs(venue.location.lng - business.longitude) < 0.00411726;
  });

  near.forEach(function (business) {
    // 25 possible points for name similarity
    var nameDistance = natural.LevenshteinDistance(cleanString(venue.name),
      business.name);

    var matchScore = nameDistance > 25 ? 0 : 25 - nameDistance;

    // 15 possible points for address similarity
    if (venue.location.address) {
      var addressDistance = natural.LevenshteinDistance(
        cleanString(venue.location.address), business.address);

      matchScore += addressDistance > 15 ? 0 : 15 - addressDistance;
    }

    // 25 points for exact phone number match
    if (venue.contact &&
      venue.contact.phone &&
      venue.contact.phone.toString() === business.phone_number.toString()) {
      matchScore += 25;
    }

    business = exports.getBusiness(business.business_id);

    business.matchScore = matchScore;
  });

  // Sort by match score
  var sorted = _.sortBy(near, function (business) {
    return -business.matchScore;
  });

  // Return the top 5 businesses
  cb(_.first(sorted, 5));
};

exports.load = function (cb) {
  async.series([
    function (seriesCb) {
      loadInspections(seriesCb);
    },

    function (seriesCb) {
      loadViolations(seriesCb);
    },

    function (seriesCb) {
      loadBusinesses(seriesCb);
    }
  ], function (err) {
    cb(err);
  });
};
