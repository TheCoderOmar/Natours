import axios from "axios";
import { showAlert } from "./alerts";

// Login Function
const login = async (email, password) => {
  console.log(email, password); // Check input values

  try {
    console.log("Attempting to login...");
    const res = await axios({
      method: "POST",
      url: "http://127.0.0.1:8000/api/v1/users/login",
      data: {
        email,
        password,
      },
    });

    console.log("Response received from API");

    if (res.data.status === "success") {
      console.log("Login successful");
      showAlert("success", "Logged in successfully");

      // Redirect to homepage after 1.5 seconds
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    console.error("Error during login", err);
    if (err.response) {
      // Handle specific error messages from the server response
      showAlert("error", err.response.data.message);
    } else {
      // Generic error
      showAlert("error", "An unknown error occurred!");
    }
  }
};

// Logout Function
const logout = async () => {
  try {
    console.log("Attempting to logout...");
    const res = await axios({
      method: "GET",
      url: "http://127.0.0.1:8000/api/v1/users/logout",
    });

    if (res.data.status === "success") {
      console.log("Logout successful");
      location.reload(true); // Reloads the page after logout
    }
  } catch (err) {
    console.error("Error during logout", err);
    showAlert("error", "Error logging out! Try again.");
  }
};
