import React, { useState, useEffect } from "react";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import { Routes } from "../routes";

// pages
import Upgrade from "./Upgrade";
import DashboardOverview from "./dashboard/DashboardOverview";
import UserRequests from "./admin/UserRequests";
import UserData from "./admin/UserData";
import Categories from "./admin/Categories";
import RequestsByCategory from "./admin/RequestsByCategory";
import Priorities from "./admin/Priorities";
import DetailRequest from "./utils/DetailRequest";
import Chat from "./utils/Chat";
import Settings from "./Settings";
import ListUserRequests from "./user/ListUserRequest";
import Signin from "./user/Signin";
import ChangePassword from "./user/ChangePassword";
// import SigninAdmin from "./admin/SigninAdmin";
import UserRequestTeam from "./team/UserRequestTeam";
import ReportRequest from "./team/ReportRequest";
import Signup from "./examples/Signup";
import ForgotPassword from "./examples/ForgotPassword";
import ResetPassword from "./examples/ResetPassword";
import Lock from "./examples/Lock";
import NotFoundPage from "./examples/NotFound";
import ServerError from "./examples/ServerError";
import AddRequest from "./user/AddRequest";
import RenderPdf from "./utils/RenderPdf";
import SlaDashboard from "./sla/SlaDashboard";

// components
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Preloader from "../components/Preloader";
import ListRequest from "./head/ListRequest";

function tokenRequiresPasswordChange(token) {
  if (!token) return false;
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return Boolean(payload.mustChangePassword);
  } catch (e) {
    return false;
  }
}

const RouteWithLoader = ({ component: Component, ...rest }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Route
      {...rest}
      render={(props) => (
        <>
          {" "}
          <Preloader show={loaded ? false : true} /> <Component {...props} />{" "}
        </>
      )}
    />
  );
};

const RouteWithSidebar = ({ component: Component, ...rest }) => {
  const [loaded, setLoaded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const token = localStorage.getItem("token");
  const blockForPassword =
    token &&
    tokenRequiresPasswordChange(token) &&
    location.pathname !== Routes.ChangePassword.path;

  return (
    <Route
      {...rest}
      render={(props) =>
        blockForPassword ? (
          <Redirect to={Routes.ChangePassword.path} />
        ) : (
          <>
            <Preloader show={loaded ? false : true} />
            <Sidebar />

            <main className="content">
              <Navbar />
              <Component {...props} />
            </main>
          </>
        )
      }
    />
  );
};

export default () => (
  <Switch>
    <RouteWithLoader exact path={Routes.Signin.path} component={Signin} />
    <RouteWithLoader
      exact
      path={Routes.ChangePassword.path}
      component={ChangePassword}
    />
    {/* <RouteWithLoader
      exact
      path={Routes.SigninAdmin.path}
      component={SigninAdmin}
    /> */}
    <RouteWithSidebar
      exact
      path={Routes.UserRequests.path}
      component={UserRequests}
    />

    <RouteWithSidebar
      exact
      path={Routes.ListRequestHead.path}
      component={ListRequest}
    />

    <RouteWithSidebar
      exact
      path={Routes.UserRequestTeam.path}
      component={UserRequestTeam}
    />
    <RouteWithSidebar
      exact
      path={Routes.RequestReport.path}
      component={ReportRequest}
    />
    <RouteWithSidebar exact path={Routes.UserData.path} component={UserData} />
    <RouteWithSidebar
      exact
      path={Routes.Categories.path}
      component={Categories}
    />
    <RouteWithSidebar
      exact
      path={Routes.RequestsByCategory.path}
      component={RequestsByCategory}
    />
    <RouteWithSidebar
      exact
      path={Routes.Priorities.path}
      component={Priorities}
    />
    <RouteWithSidebar
      exact
      path={Routes.ListUserRequests.path}
      component={ListUserRequests}
    />
    <RouteWithSidebar
      exact
      path={Routes.AddRequest.path}
      component={AddRequest}
    />
    <RouteWithSidebar
      exact
      path={Routes.DetailRequest.path}
      component={DetailRequest}
    />
    <RouteWithSidebar exact path={Routes.Chat.path} component={Chat} />
    <Route exact path={"/ticketing/render"} component={RenderPdf} />
    <RouteWithLoader exact path={Routes.Signup.path} component={Signup} />
    <RouteWithLoader
      exact
      path={Routes.ForgotPassword.path}
      component={ForgotPassword}
    />
    <RouteWithLoader
      exact
      path={Routes.ResetPassword.path}
      component={ResetPassword}
    />
    <RouteWithLoader exact path={Routes.Lock.path} component={Lock} />
    <RouteWithLoader
      exact
      path={Routes.NotFound.path}
      component={NotFoundPage}
    />
    <RouteWithLoader
      exact
      path={Routes.ServerError.path}
      component={ServerError}
    />

    {/* pages */}
    <RouteWithSidebar
      exact
      path={Routes.DashboardOverview.path}
      component={DashboardOverview}
    />
    <RouteWithSidebar exact path={Routes.Sla.path} component={SlaDashboard} />
    <RouteWithSidebar exact path={Routes.Upgrade.path} component={Upgrade} />

    <RouteWithSidebar exact path={Routes.Profile.path} component={Settings} />

    {/* components */}

    <Redirect to={Routes.NotFound.path} />
  </Switch>
);
