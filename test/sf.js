var should = require('chai').should();

var inspections = require('../lib/data');

var example = {
  name: 'Zero Zero',
  contact: {
    phone: 4153488800
  },
  location: {
    address: '826 Folsom St.',
    lat: 37.78167112478022,
    lng: -122.40177154541016
  }
};

describe('data', function () {
  before(function (done) {
    inspections.load(done);
  });

  it('should get a business', function () {
    var business = inspections.getBusiness(10);

    should.exist(business);
  });

  it('should find a business', function (done) {
    inspections.findBusiness(example, function (businesses) {
      businesses.length.should.be.above(1);

      businesses[0].matchScore.should.be.above(10);
      businesses[0].name.should.equal('zero zero');

      done();
    });
  });
});
