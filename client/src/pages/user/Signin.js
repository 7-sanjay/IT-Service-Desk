import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import {
  Col,
  Row,
  Form,
  Button,
  Container,
  InputGroup,
  Alert,
  Spinner,
} from "@themesberg/react-bootstrap";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { useJwt } from "react-jwt";

import { Routes } from "../../routes";
import { login } from "../../api/userApi";

export default () => {
  const [user, setUser] = useState({
    id_karyawan: "",
    password: "",
    // level: "",
  });
  const [pending, setIsPending] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const history = useHistory();
  const token = localStorage.getItem("token");
  const { isExpired } = useJwt(token);

  useEffect(() => {
    if (token && !isExpired) {
      history.push(Routes.DashboardOverview.path);
    }
  }, [history, isExpired, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const { data } = await login(user);

      localStorage.setItem("token", data.data.token);
      localStorage.setItem("level", data.data.level);
      localStorage.setItem("username", data.data.username);
      localStorage.setItem("fullname", data.data.fullname);
      localStorage.setItem("email", data.data.email);
      setIsPending(false);
      toast.success("Login Success!");
      history.push(Routes.DashboardOverview.path);
    } catch (error) {
      setIsPending(false);
      setError(true);
      setErrorMessage(error.response.data.message);
      toast.error("Login Failed!");
    }
  };

  return (
    <main style={{ backgroundColor: "#e8ecf1", height: "100vh" }}>
      <section className="d-flexfalse align-items-center my-5 mt-lg-6 mb-lg-5">
        <Container>
          <Row className="justify-content-center form-bg-image">
            <Col
              xs={12}
              className="d-flex align-items-center justify-content-center"
            >
              <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100 fmxw-450">
                <div className="text-center text-md-center mb-4 mt-md-0">
                  <h3 className="mb-0">Log in</h3>
                </div>
                {error && <Alert variant="danger">{errorMessage}</Alert>}
                <Form className="mt-4" onSubmit={(e) => handleSubmit(e)}>
                  <Form.Group id="username" className="mb-4">
                    <Form.Label>Employee ID or Username</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faUser} />
                      </InputGroup.Text>
                      <Form.Control
                        autoFocus
                        required
                        type="text"
                        placeholder="Employee ID or username"
                        name="id_karyawan"
                        onChange={(e) =>
                          setUser({ ...user, id_karyawan: e.target.value })
                        }
                      />
                    </InputGroup>
                  </Form.Group>
                  <Form.Group>
                    <Form.Group id="password" className="mb-4">
                      <Form.Label>Password</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>
                          <FontAwesomeIcon icon={faLock} />
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
                  {/* <Form.Group>
                    <Form.Group id="level" className="mb-4">
                      <Form.Label>Level</Form.Label>
                      <Form.Select
                        onChange={(e) =>
                          setUser({ ...user, level: e.target.value })
                        }
                      >
                        <option defaultValue>Choose level</option>
                        <option value="user">User</option>
                        <option value="team">Team</option>
                      </Form.Select>
                    </Form.Group>
                  </Form.Group> */}
                  {pending ? (
                    <Button
                      variant="primary"
                      type="submit"
                      disabled
                      className="w-100"
                    >
                      <Spinner animation="border" size="sm" role="status" />{" "}
                      Logging...
                    </Button>
                  ) : (
                    <Button variant="primary" type="submit" className="w-100">
                      Log in
                    </Button>
                  )}

                  {/* create link to login as admin */}
                  <p className="text-center mt-4 text-gray-700">
                    SERVICE DESK SYSTEM
                    {/* <Card.Link
                      as={Link}
                      to={Routes.SigninAdmin.path}
                      className="text-gray-700"
                    >
                      Login as Admin
                    </Card.Link> */}
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
