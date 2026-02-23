import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUnlock, faUser } from "@fortawesome/free-solid-svg-icons";
import {
  Col,
  Row,
  Form,
  Card,
  Button,
  Container,
  InputGroup,
  Alert,
} from "@themesberg/react-bootstrap";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

import { Routes } from "../../routes";

export default () => {
  const [user, setUser] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState(false);
  const history = useHistory();

  const handleSubmit = (e) => {
    e.preventDefault();
    // axios
    //   .post("http://localhost:4000/api/login-admin", user, {
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   })
    //   .then((res) => {
    //     if (res.data.status === "success") {
    //       localStorage.setItem("token", res.data.data.token);
    //       localStorage.setItem("level", res.data.data.level);
    //       localStorage.setItem("username", res.data.data.username);
    //       toast.success("Login Success!");
    //       history.push(Routes.DashboardOverview.path);
    //     }
    //   })
    //   .catch(() => {
    //     setError(true);
    //   });
  };

  return (
    <main style={{ backgroundColor: "#e8ecf1", height: "100vh" }}>
      <section className="d-flex align-items-center my-5 mt-lg-6 mb-lg-5">
        <Container>
          <Row className="justify-content-center form-bg-image">
            <Col
              xs={12}
              className="d-flex align-items-center justify-content-center"
            >
              <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100 fmxw-450">
                <div className="text-center text-md-center mb-4 mt-md-0">
                  <h3 className="mb-0">Log in as Admin</h3>
                </div>
                {error && (
                  <Alert variant="danger">
                    Username or password is incorrect!
                  </Alert>
                )}
                <Form className="mt-4" onSubmit={(e) => handleSubmit(e)}>
                  <Form.Group id="username" className="mb-4">
                    <Form.Label>Username</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faUser} />
                      </InputGroup.Text>
                      <Form.Control
                        autoFocus
                        required
                        type="text"
                        placeholder="Username"
                        name="username"
                        onChange={(e) =>
                          setUser({ ...user, username: e.target.value })
                        }
                      />
                    </InputGroup>
                  </Form.Group>
                  <Form.Group>
                    <Form.Group id="password" className="mb-4">
                      <Form.Label>Password</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>
                          <FontAwesomeIcon icon={faUnlock} />
                        </InputGroup.Text>
                        <Form.Control
                          required
                          type="password"
                          placeholder="Password"
                          name="password"
                          onChange={(e) =>
                            setUser({ ...user, password: e.target.value })
                          }
                        />
                      </InputGroup>
                    </Form.Group>
                  </Form.Group>
                  <Button variant="primary" type="submit" className="w-100">
                    Sign in
                  </Button>
                  {/* create link to login as admin */}
                  <p className="text-center mt-4">
                    <Card.Link
                      as={Link}
                      to={Routes.Signin.path}
                      className="text-gray-700"
                    >
                      Login as User
                    </Card.Link>
                  </p>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </main>
  );
};
