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
  return _.trim(address.replace(/[^a-z0-9 ]/ig, '').toLowerCase());
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

//var example = {
//  name: 'Zero Zero',
//  contact: {
//    phone: 4153488800
//  },
//  location: {
//    address: '826 Folsom St.',
//    lat: 37.78167112478022,
//    lng: -122.40177154541016
//  }
//};

exports.findBusiness = function (venue, cb) {
  var near = exports.businesses.filter(function (business) {
    return Math.abs(venue.location.lat - business.latitude) < 0.00137242 &&
      Math.abs(venue.location.lng - business.longitude) < 0.00137242;
  });

  near.forEach(function (business) {
    // 10 possible points for name similarity
    var nameDistance = natural.LevenshteinDistance(cleanString(venue.name),
      business.name);

    business.matchScore = nameDistance > 10 ? 0 : 10 - nameDistance;

    // 10 possible points for address similarity
    if (venue.location.address) {
      var addressDistance = natural.LevenshteinDistance(
        cleanString(venue.location.address), business.address);

      business.matchScore += addressDistance > 10 ? 0 : 10 - addressDistance;
    }

    // 10 points for exact phone number match
    if (venue.contact &&
      venue.contact.phone &&
      venue.contact.phone.toString() === business.phone_number.toString()) {
      business.matchScore += 10;
    }

    // Find inspects for this business
    business.inspections = exports.inspections.filter(function (inspection) {
      return inspection.business_id === business.business_id;
    });

    // Find violations for this business
    business.violations = exports.violations.filter(function (violation) {
      return violation.business_id === business.business_id;
    });
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
      loadInspections(function (err, count) {
        console.log('Loaded', count, 'inspections.');
        //console.log(JSON.stringify(exports.inspections[0], null, 2));

        seriesCb(err);
      });
    },

    function (seriesCb) {
      loadViolations(function (err, count) {
        console.log('Loaded', count, 'violations.');
        //console.log(JSON.stringify(exports.violations[0], null, 2));

        seriesCb(err);
      });
    },

    function (seriesCb) {
      loadBusinesses(function (err, count) {
        console.log('Loaded', count, 'businesses.');
        //console.log(JSON.stringify(exports.businesses[0], null, 2));

        seriesCb(err);
      });
    }
  ], function (err) {
    //exports.findBusiness(example, function (businesses) {
    //  console.log('XXX', JSON.stringify(businesses, null, 2));
    //});

    cb(err);
  });
};

//exports.load(function () {
//  console.log('Loaded.');
//});
