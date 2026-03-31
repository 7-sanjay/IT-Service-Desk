import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
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

import { Routes } from "../../routes";
import { changeOwnPassword } from "../../api/userApi";

function jwtMustChangePassword(token) {
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

export default () => {
  const history = useHistory();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      history.replace(Routes.Signin.path);
      return;
    }
    if (!jwtMustChangePassword(token)) {
      history.replace(Routes.DashboardOverview.path);
      return;
    }
    setAllowed(true);
  }, [history]);

  if (!allowed) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      setPending(true);
      const { data } = await changeOwnPassword({
        currentPassword,
        newPassword,
      });
      localStorage.setItem("token", data.data.token);
      toast.success("Password updated. You can continue using the app.");
      history.push(Routes.DashboardOverview.path);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Could not update password. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <main style={{ backgroundColor: "#e8ecf1", minHeight: "100vh" }}>
      <section className="d-flex align-items-center my-5 mt-lg-6 mb-lg-5">
        <Container>
          <Row className="justify-content-center form-bg-image">
            <Col
              xs={12}
              className="d-flex align-items-center justify-content-center"
            >
              <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100 fmxw-450">
                <div className="text-center text-md-center mb-4 mt-md-0">
                  <h3 className="mb-0">Set a new password</h3>
                  <p className="text-gray-700 small mt-2 mb-0">
                    You signed in with a temporary password from your welcome
                    email. Choose a new password to continue.
                  </p>
                </div>
                {error ? <Alert variant="danger">{error}</Alert> : null}
                <Form className="mt-4" onSubmit={handleSubmit}>
                  <Form.Group className="mb-4">
                    <Form.Label>Current (temporary) password</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faLock} />
                      </InputGroup.Text>
                      <Form.Control
                        required
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>New password</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faLock} />
                      </InputGroup.Text>
                      <Form.Control
                        required
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </InputGroup>
                    <Form.Text muted>At least 8 characters.</Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Confirm new password</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faLock} />
                      </InputGroup.Text>
                      <Form.Control
                        required
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                  {pending ? (
                    <Button variant="primary" className="w-100" disabled>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving…
                    </Button>
                  ) : (
                    <Button variant="primary" type="submit" className="w-100">
                      Update password
                    </Button>
                  )}
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </main>
  );
};
