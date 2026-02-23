import React from "react";
import ReactDOM from "react-dom";
import UserData from "../UserData";
it("renders without crashing", () => {
  const div = document.createElement("div");
  ReactDOM.render(<UserData />, div);
});
