const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Please provide a review"]
    },
    rating: {
      type: Number,
      min: [1, "Raiting must be above 1.0"],
      max: [5, "Raiting must be below 5.0"]
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"]
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"]
    }
  },
  {
    //Include virtual properties when a review ins converted from-to JSON-Object
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: "tour",
  //   select: "name  -guides"
  // }).populate({
  //   path: "user",
  //   select: "name photo -_id"
  // });

  this.populate({
    path: "user",
    select: "name photo -_id"
  });

  next();
});

/*
Calcula el numero de opiniones y el promedio total de la calificacion de un Tour
*/
reviewSchema.statics.calculateAverageRaitings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: "$tour",
        ratingsNumber: { $sum: 1 },
        ratingsAverage: { $avg: "$rating" }
      }
    }
  ]);

  let ratingsQuantity = 0;
  let ratingsAverage = 4.5;

  if (stats.length > 0) {
    ratingsQuantity = stats[0].ratingsNumber;
    ratingsAverage = stats[0].ratingsAverage;
  }

  console.log(ratingsQuantity, ratingsAverage);

  await Tour.findByIdAndUpdate(tourId, { ratingsQuantity, ratingsAverage });
};

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.post("save", function() {
  //this points to current review
  this.constructor.calculateAverageRaitings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.review = await this.findOne();
  console.log(this.review);
  next();
});

/*
This middleware is executed after a tour's rating is updated or deleted
*/
reviewSchema.post(/^findOneAnd/, async function(next) {
  if (this.review)
    this.review.constructor.calculateAverageRaitings(this.review.tour);
});

module.exports = mongoose.model("Review", reviewSchema);
