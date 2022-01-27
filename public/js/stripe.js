/* eslint-disable */
import axios from "axios";
import { showAlert } from "./alerts";

// Public key
const stripe = Stripe(
  "pk_test_51KKXegKrssDgJvLzUqwangHYXWHcvnDnYrjGt0YjUgE3CZyK8DLKp16UwD48VRQBHQjPVWxTahW4NRIMkoQQQMAS00x2qOpHMp"
);

export const bookTour = async tourId => {
  try {
    //  1) Get checkout session from
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    //  2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (error) {
    console.log(error);
    showAlert("error", error);
  }
};
