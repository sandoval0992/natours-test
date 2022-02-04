const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const handlerFactory = require("./handlerFactory");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    // success_url: `${req.protocol}://${req.get("host")}/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get("host")}/my-tours`,
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`
        ],
        amount: tour.price * 100,
        currency: "usd",
        quantity: 1
      }
    ]
  });

  // 3) Create session as response
  res.status(200).json({
    status: "success",
    session
  });
});

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   const { tour, user, price } = req.query;

//   if (!tour && !user && !price) return next();

//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split("?")[0]);
// });

const createBookingCheckout = async session => {
  console.log("Creating booking with session:");
  console.log(session);
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;
  console.log(tour, user, price);
  await Booking.create({ tour, user, price });
  console.log("Booking created successfully.");
};

exports.webhookCheckout = (req, res, next) => {
  console.log(req.headers);
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err}`);
  }

  if (event && event.type === "checkout.session.completed")
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = handlerFactory.createOne(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBookings = handlerFactory.getAll(Booking);
